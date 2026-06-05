const mongoose = require('mongoose');

const cmsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  section: { type: String, required: true, enum: ['hero', 'about', 'contact', 'footer', 'social', 'faq', 'testimonial', 'banner', 'general'] },
  title: String,
  subtitle: String,
  content: String,
  data: { type: mongoose.Schema.Types.Mixed },
  images: [String],
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CMS', cmsSchema);
