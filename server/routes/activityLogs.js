const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { adminProtect } = require('../middleware/auth');
const { sanitizeError } = require('../utils/sanitizeError');

// Recent entries for the dashboard widget
router.get('/recent', adminProtect, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const logs = await ActivityLog.find().sort('-createdAt').limit(limit).populate('admin', 'name');
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Full audit list with filters
router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20, module, admin, from, to } = req.query;
    const query = {};
    if (module) query.module = module;
    if (admin) query.admin = admin;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .populate('admin', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    res.json({ success: true, logs, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
