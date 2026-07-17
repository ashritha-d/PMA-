const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  action: { type: String, required: true },   // created | updated | status_changed | signed | deleted
  module: { type: String, required: true },   // Property | Tenant | Contract | FinTrans | ServTrans | Payment
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceLabel: { type: String, trim: true }, // denormalized human code (propertyCode/seqRef/etc)
  description: { type: String, trim: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ admin: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
