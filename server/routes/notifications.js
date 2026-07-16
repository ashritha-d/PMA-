const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, adminProtect } = require('../middleware/auth');
const { sanitizeError } = require('../utils/sanitizeError');

router.get('/user', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id, recipientModel: 'User' }).sort('-createdAt').limit(20);
    const unread = await Notification.countDocuments({ recipient: req.user._id, recipientModel: 'User', isRead: false });
    res.json({ success: true, notifications, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.get('/admin', adminProtect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.admin._id, recipientModel: 'Admin' }).sort('-createdAt').limit(30);
    const unread = await Notification.countDocuments({ recipient: req.admin._id, recipientModel: 'Admin', isRead: false });
    res.json({ success: true, notifications, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.put('/read-all/user', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, recipientModel: 'User' }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.put('/read-all/admin', adminProtect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.admin._id, recipientModel: 'Admin' }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
