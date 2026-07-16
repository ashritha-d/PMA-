// Turns a raw Mongoose/MongoDB error into a safe, generic message for the
// client, while still logging the full detail server-side. Prevents cast
// errors, validation errors, and duplicate-key errors from leaking internal
// field/index/schema names to API consumers.
function sanitizeError(err) {
  console.error(err.stack || err.message || err);

  if (err.name === 'CastError') {
    return `Invalid value provided for "${err.path}"`;
  }
  if (err.name === 'ValidationError') {
    const firstField = Object.keys(err.errors || {})[0];
    return firstField ? `Invalid value for "${firstField}"` : 'Validation failed';
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return field ? `A record with that ${field} already exists` : 'Duplicate record';
  }
  return 'An unexpected error occurred. Please try again.';
}

module.exports = { sanitizeError };
