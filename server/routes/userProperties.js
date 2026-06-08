const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const UserProperty = require('../models/UserProperty');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Ensure directories exist
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

// GET /api/user-properties/my/stats
router.get('/my/stats', protect, async (req, res) => {
  try {
    const [total, available, occupied, maintenance] = await Promise.all([
      UserProperty.countDocuments({ owner: req.user._id }),
      UserProperty.countDocuments({ owner: req.user._id, status: 'Available' }),
      UserProperty.countDocuments({ owner: req.user._id, status: 'Occupied' }),
      UserProperty.countDocuments({ owner: req.user._id, status: 'Under Maintenance' }),
    ]);
    const incomeAgg = await UserProperty.aggregate([
      { $match: { owner: req.user._id, status: 'Occupied', rentAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$rentAmount' } } },
    ]);
    const monthlyIncome = incomeAgg[0]?.total || 0;
    res.json({ success: true, stats: { total, available, occupied, maintenance, monthlyIncome } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/user-properties/my
router.get('/my', protect, async (req, res) => {
  try {
    const { search, status, type, sort = '-createdAt' } = req.query;
    const query = { owner: req.user._id };
    if (status) query.status = status;
    if (type) query.propertyType = type;
    if (search) query.propertyName = { $regex: search, $options: 'i' };
    const properties = await UserProperty.find(query).sort(sort).lean();
    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/user-properties/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const property = await UserProperty.findOne({ _id: req.params.id, owner: req.user._id });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/user-properties
router.post('/', protect, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
]), async (req, res) => {
  try {
    const data = { ...req.body, owner: req.user._id };

    // Parse boolean/number fields from FormData strings
    if (data.parking !== undefined) data.parking = data.parking === 'true' || data.parking === true;
    ['totalArea', 'bedrooms', 'bathrooms', 'floors', 'rentAmount', 'securityDeposit', 'maintenanceCharges', 'salePrice'].forEach(f => {
      if (data[f] !== undefined && data[f] !== '') data[f] = Number(data[f]);
      else if (data[f] === '') data[f] = null;
    });

    // Handle uploaded images
    if (req.files?.images) {
      data.images = req.files.images.map(f => ({
        url: `/uploads/properties/${f.filename}`,
        filename: f.filename,
      }));
      if (!data.coverImage && data.images.length > 0) {
        data.coverImage = data.images[0].url;
      }
    }

    // Handle uploaded documents
    if (req.files?.documents) {
      const docNames = Array.isArray(data.documentNames) ? data.documentNames : [data.documentNames].filter(Boolean);
      const docTypes = Array.isArray(data.documentTypes) ? data.documentTypes : [data.documentTypes].filter(Boolean);
      data.documents = req.files.documents.map((f, i) => ({
        name: docNames[i] || f.originalname,
        url: `/uploads/documents/${f.filename}`,
        filename: f.filename,
        docType: docTypes[i] || 'other',
      }));
    }

    const property = await UserProperty.create(data);
    res.status(201).json({ success: true, property });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/user-properties/:id
router.put('/:id', protect, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
]), async (req, res) => {
  try {
    const property = await UserProperty.findOne({ _id: req.params.id, owner: req.user._id });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const data = { ...req.body };

    if (data.parking !== undefined) data.parking = data.parking === 'true' || data.parking === true;
    ['totalArea', 'bedrooms', 'bathrooms', 'floors', 'rentAmount', 'securityDeposit', 'maintenanceCharges', 'salePrice'].forEach(f => {
      if (data[f] !== undefined && data[f] !== '') data[f] = Number(data[f]);
      else if (data[f] === '') data[f] = null;
    });

    // Append new images to existing
    if (req.files?.images) {
      const newImages = req.files.images.map(f => ({
        url: `/uploads/properties/${f.filename}`,
        filename: f.filename,
      }));
      data.images = [...(property.images || []), ...newImages];
      if (!property.coverImage && data.images.length > 0) {
        data.coverImage = data.images[0].url;
      }
    }

    // Append new documents
    if (req.files?.documents) {
      const docNames = Array.isArray(data.documentNames) ? data.documentNames : [data.documentNames].filter(Boolean);
      const docTypes = Array.isArray(data.documentTypes) ? data.documentTypes : [data.documentTypes].filter(Boolean);
      const newDocs = req.files.documents.map((f, i) => ({
        name: docNames[i] || f.originalname,
        url: `/uploads/documents/${f.filename}`,
        filename: f.filename,
        docType: docTypes[i] || 'other',
      }));
      data.documents = [...(property.documents || []), ...newDocs];
    }

    Object.assign(property, data);
    await property.save();
    res.json({ success: true, property });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/user-properties/:id/status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const property = await UserProperty.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status: req.body.status },
      { new: true }
    );
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    res.json({ success: true, property });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/user-properties/:id/image/:index
router.delete('/:id/image/:index', protect, async (req, res) => {
  try {
    const property = await UserProperty.findOne({ _id: req.params.id, owner: req.user._id });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    const idx = parseInt(req.params.index);
    const removed = property.images.splice(idx, 1);
    if (removed[0]?.filename) {
      const filePath = path.join(__dirname, '../uploads/properties', removed[0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (property.coverImage === removed[0]?.url) {
      property.coverImage = property.images[0]?.url || '';
    }
    await property.save();
    res.json({ success: true, property });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/user-properties/:id/document/:index
router.delete('/:id/document/:index', protect, async (req, res) => {
  try {
    const property = await UserProperty.findOne({ _id: req.params.id, owner: req.user._id });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    const idx = parseInt(req.params.index);
    const removed = property.documents.splice(idx, 1);
    if (removed[0]?.filename) {
      const filePath = path.join(__dirname, '../uploads/documents', removed[0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await property.save();
    res.json({ success: true, property });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/user-properties/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const property = await UserProperty.findOne({ _id: req.params.id, owner: req.user._id });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    // Delete image files
    property.images.forEach(img => {
      if (img.filename) {
        const fp = path.join(__dirname, '../uploads/properties', img.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    });
    // Delete document files
    property.documents.forEach(doc => {
      if (doc.filename) {
        const fp = path.join(__dirname, '../uploads/documents', doc.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    });

    await property.deleteOne();
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
