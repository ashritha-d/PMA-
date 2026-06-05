const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Property = require('../models/Property');
const { protect, adminProtect } = require('../middleware/auth');

router.get('/property/:propertyId', async (req, res) => {
  try {
    const reviews = await Review.find({ property: req.params.propertyId, isApproved: true }).populate('user', 'firstName lastName photo').sort('-createdAt');
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const existing = await Review.findOne({ property: req.body.property, user: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'Already reviewed' });

    const review = await Review.create({ ...req.body, user: req.user._id });

    const reviews = await Review.find({ property: req.body.property, isApproved: true });
    const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
    await Property.findByIdAndUpdate(req.body.property, { rating: avg.toFixed(1), reviewCount: reviews.length });

    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', adminProtect, async (req, res) => {
  try {
    const reviews = await Review.find().populate('user', 'firstName lastName').populate('property', 'title').sort('-createdAt');
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
