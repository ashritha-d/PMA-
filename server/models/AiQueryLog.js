const mongoose = require('mongoose');

const aiQueryLogSchema = new mongoose.Schema({
  feature: { type: String, enum: ['description', 'ocr', 'recommendation'], required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceModel: { type: String },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  success: { type: Boolean, required: true },
  latencyMs: { type: Number },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});

aiQueryLogSchema.index({ feature: 1, createdAt: -1 });

module.exports = mongoose.model('AiQueryLog', aiQueryLogSchema);
