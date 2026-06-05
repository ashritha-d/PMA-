const express = require('express');
const router = express.Router();
const CMS = require('../models/CMS');
const { adminProtect } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { section } = req.query;
    const query = { isActive: true };
    if (section) query.section = section;
    const content = await CMS.find(query).sort('order');
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/key/:key', async (req, res) => {
  try {
    const content = await CMS.findOne({ key: req.params.key, isActive: true });
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', adminProtect, async (req, res) => {
  try {
    const existing = await CMS.findOne({ key: req.body.key });
    let content;
    if (existing) {
      content = await CMS.findByIdAndUpdate(existing._id, { ...req.body, updatedBy: req.admin._id, updatedAt: Date.now() }, { new: true });
    } else {
      content = await CMS.create({ ...req.body, updatedBy: req.admin._id });
    }
    const io = req.app.get('io');
    if (io) io.emit('cms_update', { key: req.body.key });
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', adminProtect, async (req, res) => {
  try {
    const content = await CMS.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.admin._id, updatedAt: Date.now() }, { new: true });
    const io = req.app.get('io');
    if (io) io.emit('cms_update', { key: content.key });
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    await CMS.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Content deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
