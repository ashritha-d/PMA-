const mongoose = require('mongoose');

const aiQueryLogSchema = new mongoose.Schema({
  feature: { type: String, enum: ['description', 'ocr', 'recommendation', 'chat'], required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceModel: { type: String },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  // Voice-assistant locale for 'chat' entries ('en-IN'/'hi-IN'/'te-IN'); unset
  // for other features or callers that didn't send a language.
  language: { type: String },
  success: { type: Boolean, required: true },
  latencyMs: { type: Number },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});

aiQueryLogSchema.index({ feature: 1, createdAt: -1 });

module.exports = mongoose.model('AiQueryLog', aiQueryLogSchema);
