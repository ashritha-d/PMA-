const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { adminProtect } = require('../middleware/auth');
const { sanitizeError } = require('../utils/sanitizeError');

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('order');
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.post('/', adminProtect, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.put('/:id', adminProtect, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
