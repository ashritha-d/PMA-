const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget: a logging failure must never break the request that
// triggered it, so errors are swallowed here rather than propagated.
async function logActivity({ admin, action, module, referenceId, referenceLabel, description, metadata }) {
  try {
    await ActivityLog.create({ admin, action, module, referenceId, referenceLabel, description, metadata });
  } catch (err) {
    console.error('activityLogger failed:', err.message);
  }
}

module.exports = { logActivity };
