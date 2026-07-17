require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const { sanitizeError } = require('./utils/sanitizeError');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_USER_URL, process.env.CLIENT_ADMIN_URL],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

connectDB();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: [process.env.CLIENT_USER_URL, process.env.CLIENT_ADMIN_URL],
  credentials: true,
}));
// Actual file uploads go through multer (multipart/form-data), not this
// JSON/urlencoded parser, so 50mb here was pure unused attack surface for a
// large-payload DoS. Every JSON body in this app is plain text (contract
// e-signature is a name + timestamp string, not a canvas image; property
// data is a modest JSON object) — 512kb is generous headroom over anything
// legitimate while cutting the previous DoS surface by ~100x.
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

app.set('io', io);

const connectedUsers = new Map();
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(userId);
  });

  // Admin-only real-time channel: a socket only joins 'admin-room' after
  // presenting a valid admin JWT, verified server-side — previously admin
  // notifications (new registrations, payments, bookings) were broadcast to
  // every connected socket via io.emit(), admin or not.
  socket.on('admin_join', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const admin = await Admin.findById(decoded.id);
      if (admin && admin.isActive) socket.join('admin-room');
    } catch {
      // invalid/expired token — socket simply doesn't join the room
    }
  });

  socket.on('disconnect', () => {
    connectedUsers.forEach((sid, uid) => { if (sid === socket.id) connectedUsers.delete(uid); });
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/users', require('./routes/users'));
app.use('/api/user-properties', require('./routes/userProperties'));
app.use('/api/owners', require('./routes/owners'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/tenant-portal', require('./routes/tenantPortal'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/fintrans', require('./routes/finTrans'));
app.use('/api/servtrans', require('./routes/servTrans'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/purchase-contracts', require('./routes/purchaseContracts'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, message: sanitizeError(err) });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, io };
