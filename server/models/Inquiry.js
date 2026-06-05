const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  inquiryId: { type: String, unique: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  subject: String,
  message: { type: String, required: true },
  type: { type: String, enum: ['property', 'general', 'visit_request'], default: 'property' },
  status: { type: String, enum: ['new', 'in_progress', 'resolved', 'closed'], default: 'new' },
  adminResponse: String,
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  respondedAt: Date,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

inquirySchema.pre('save', function (next) {
  if (!this.inquiryId) {
    this.inquiryId = 'INQ' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('Inquiry', inquirySchema);
