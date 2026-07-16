const express = require('express');
const router = express.Router();
const ServTrans = require('../models/ServTrans');
const { adminProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sanitizeError } = require('../utils/sanitizeError');

// Status counts for pipeline header
router.get('/stats', adminProtect, async (req, res) => {
  try {
    const counts = await ServTrans.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const stats = { open: 0, assigned: 0, in_progress: 0, completed: 0, closed: 0 };
    counts.forEach(c => { if (stats[c._id] !== undefined) stats[c._id] = c.count; });
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// List service requests
router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, requestType, propertyCode } = req.query;
    const query = {};
    if (status) query.status = status;
    if (requestType) query.requestType = requestType;
    if (propertyCode) query.propertyCode = propertyCode;
    if (search) {
      query.$or = [
        { seqRef: { $regex: search, $options: 'i' } },
        { propertyCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { attendedBy: { $regex: search, $options: 'i' } },
        { tenantCode: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await ServTrans.countDocuments(query);
    const requests = await ServTrans.find(query)
      .populate('propertyId', 'title propertyCode')
      .populate('tenantId', 'firstName lastName')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    res.json({ success: true, requests, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Single request
router.get('/:id', adminProtect, async (req, res) => {
  try {
    const req_ = await ServTrans.findById(req.params.id)
      .populate('propertyId', 'title propertyCode address')
      .populate('tenantId', 'firstName lastName tenantCode mobile')
      .populate('createdBy', 'name');
    if (!req_) return res.status(404).json({ success: false, message: 'Service request not found' });
    res.json({ success: true, request: req_ });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Upload fields: before images + after images
const imgFields = [
  { name: 'beforeImages', maxCount: 5 },
  { name: 'afterImages', maxCount: 5 },
];

// Create service request
router.post('/', adminProtect, upload.fields(imgFields), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const files = req.files || {};
    const toArr = (field) => (files[field] || []).map(f => ({ url: f.path?.startsWith('http') ? f.path : `/uploads/documents/${f.filename}`, filename: f.filename }));
    data.beforeImages = toArr('beforeImages');
    data.afterImages  = toArr('afterImages');
    const request = await ServTrans.create({ ...data, createdBy: req.admin._id });
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Update request
router.put('/:id', adminProtect, upload.fields(imgFields), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const files = req.files || {};

    const existing = await ServTrans.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Service request not found' });

    const toArr = (field) => (files[field] || []).map(f => ({ url: f.path?.startsWith('http') ? f.path : `/uploads/documents/${f.filename}`, filename: f.filename }));
    const newBefore = toArr('beforeImages');
    const newAfter  = toArr('afterImages');

    // Merge with existing images (kept images sent back in data)
    data.beforeImages = [...(data.existingBeforeImages || existing.beforeImages), ...newBefore];
    data.afterImages  = [...(data.existingAfterImages  || existing.afterImages),  ...newAfter];
    delete data.existingBeforeImages;
    delete data.existingAfterImages;

    const updated = await ServTrans.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Quick status update
router.patch('/:id/status', adminProtect, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'assigned', 'in_progress', 'completed', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const updated = await ServTrans.findByIdAndUpdate(req.params.id, { status, updatedAt: Date.now() }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Delete
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const deleted = await ServTrans.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Service request deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
