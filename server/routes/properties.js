const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const { adminProtect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, type, listingType, city, minPrice, maxPrice, bedrooms, furnished, status, search, featured } = req.query;
    const query = { isActive: true };
    if (type) query.type = type;
    if (listingType) query.listingType = listingType;
    if (city) query['address.city'] = { $regex: city, $options: 'i' };
    if (minPrice || maxPrice) { query.price = {}; if (minPrice) query.price.$gte = Number(minPrice); if (maxPrice) query.price.$lte = Number(maxPrice); }
    if (bedrooms) query['features.bedrooms'] = { $gte: Number(bedrooms) };
    if (furnished) query['features.furnished'] = furnished;
    if (status) query.status = status;
    if (featured === 'true') query.isFeatured = true;
    if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }, { 'address.city': { $regex: search, $options: 'i' } }];

    const total = await Property.countDocuments(query);
    const properties = await Property.find(query)
      .populate('category', 'name icon')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, properties, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('category', 'name icon')
      .populate('createdByUser', 'firstName lastName email phone');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    await Property.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', adminProtect, upload.array('images', 10), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data || '{}');
    const images = (req.files || []).map(f => ({ url: `/uploads/properties/${f.filename}`, public_id: f.filename }));
    const property = await Property.create({ ...data, images, createdBy: req.admin._id });

    const io = req.app.get('io');
    if (io) io.emit('property_update', { type: 'new', property });

    const admins = await Admin.find({ isActive: true, _id: { $ne: req.admin._id } });
    for (const a of admins) {
      await Notification.create({ recipient: a._id, recipientModel: 'Admin', type: 'property', title: 'New Property Added', message: `Property "${property.title}" has been added.` });
    }

    res.status(201).json({ success: true, property });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', adminProtect, upload.array('images', 10), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const newImages = (req.files || []).map(f => ({ url: `/uploads/properties/${f.filename}`, public_id: f.filename }));
    const existingImages = data.existingImages || property.images;

    const updated = await Property.findByIdAndUpdate(
      req.params.id,
      { ...data, images: [...existingImages, ...newImages], updatedAt: Date.now() },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) io.emit('property_update', { type: 'update', property: updated });

    res.json({ success: true, property: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    const io = req.app.get('io');
    if (io) io.emit('property_update', { type: 'delete', propertyId: req.params.id });
    res.json({ success: true, message: 'Property removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/featured', adminProtect, async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, { isFeatured: req.body.isFeatured }, { new: true });
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
