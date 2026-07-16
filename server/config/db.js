const mongoose = require('mongoose');

// A transient connection failure (network blip, DNS hiccup, Atlas
// maintenance) used to kill the entire process via process.exit(1), taking
// down every route — including ones that don't even need the DB — until
// something external restarted it. This retries with backoff instead and
// lets the HTTP server keep running; DB-dependent routes will simply error
// individually (and cleanly, via the sanitized error handler) until the
// connection recovers.
//
// isConnecting guards against overlapping attempts: mongoose's own
// 'disconnected' event can fire during a still-failing initial connection
// (not only after a previously-successful one drops), and without this
// guard that event and this module's own retry loop would each start
// independent connect() calls, stacking concurrently forever.
const RETRY_DELAYS_MS = [2000, 5000, 10000, 30000]; // caps at 30s between attempts
let isConnecting = false;
let retryTimer = null;

const connectDB = async (attempt = 0) => {
  if (isConnecting) return;
  isConnecting = true;
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    console.error(`MongoDB connection error (attempt ${attempt + 1}): ${error.message}. Retrying in ${delay / 1000}s...`);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      isConnecting = false;
      connectDB(attempt + 1);
    }, delay);
    return; // stay "connecting" until the scheduled retry actually fires
  }
  isConnecting = false;
};

// Only reconnect on a drop of a *previously established* connection —
// mongoose fires 'connected' once that initial success happens, so this
// listener has nothing to do with (and won't race) the initial-attempt
// retry loop above.
mongoose.connection.on('disconnected', () => {
  if (mongoose.connection.readyState === 0 && !isConnecting) {
    console.error('MongoDB disconnected — attempting to reconnect...');
    connectDB();
  }
});

module.exports = connectDB;
