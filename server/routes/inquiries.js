const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const { protect, adminProtect, optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.user) data.user = req.user._id;
    const inquiry = await Inquiry.create(data);

    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await Notification.create({ recipient: admin._id, recipientModel: 'Admin', type: 'inquiry', title: 'New Inquiry', message: `New inquiry from ${data.name}: ${data.subject || data.message.substring(0, 50)}` });
    }

    const io = req.app.get('io');
    if (io) io.emit('admin_notification', { type: 'inquiry', message: 'New inquiry received' });

    res.status(201).json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ user: req.user._id }).populate('property', 'title').sort('-createdAt');
    res.json({ success: true, inquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = status ? { status } : {};
    const inquiries = await Inquiry.find(query).populate('property', 'title').populate('user', 'firstName lastName').sort('-createdAt').limit(limit * 1).skip((page - 1) * limit);
    const total = await Inquiry.countDocuments(query);
    res.json({ success: true, inquiries, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', adminProtect, async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { ...req.body, respondedBy: req.admin._id, respondedAt: Date.now(), isRead: true }, { new: true });
    if (inquiry.user && req.body.adminResponse) {
      await Notification.create({ recipient: inquiry.user, recipientModel: 'User', type: 'inquiry', title: 'Inquiry Response', message: req.body.adminResponse.substring(0, 100) });
    }
    res.json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
