const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const Property = require('../models/Property');
const { adminProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

// List owners with pagination + search
router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 15, search, status } = req.query;
    const query = {};
    if (status === 'active') query.isActive = true;
    else if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { ownerCode: { $regex: search, $options: 'i' } },
        { passportNumber: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await Owner.countDocuments(query);
    const owners = await Owner.find(query)
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    res.json({ success: true, owners, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single owner
router.get('/:id', adminProtect, async (req, res) => {
  try {
    const owner = await Owner.findById(req.params.id).populate('createdBy', 'name').populate('approvedBy', 'name');
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    res.json({ success: true, owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get properties linked to an owner
router.get('/:id/properties', adminProtect, async (req, res) => {
  try {
    const owner = await Owner.findById(req.params.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    const properties = await Property.find({
      $or: [
        { 'ownerInfo.ownerCode': owner.ownerCode },
        { primaryOwner: owner._id },
      ],
    }).select('propertyCode title type address status price images');
    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create owner with optional document uploads
const ownerDocFields = [
  { name: 'eidImage', maxCount: 1 },
  { name: 'passportCopy', maxCount: 1 },
  { name: 'residenceVisa', maxCount: 1 },
];

router.post('/', adminProtect, upload.fields(ownerDocFields), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const files = req.files || {};

    const docFields = ['eidImage', 'passportCopy', 'residenceVisa'];
    docFields.forEach((field) => {
      if (files[field]?.[0]) {
        data[field] = {
          url: files[field][0].path?.startsWith('http') ? files[field][0].path : `/uploads/documents/${files[field][0].filename}`,
          filename: files[field][0].filename,
        };
      }
    });

    const owner = await Owner.create({ ...data, createdBy: req.admin._id });
    res.status(201).json({ success: true, owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update owner
router.put('/:id', adminProtect, upload.fields(ownerDocFields), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const files = req.files || {};

    const docFields = ['eidImage', 'passportCopy', 'residenceVisa'];
    docFields.forEach((field) => {
      if (files[field]?.[0]) {
        data[field] = {
          url: files[field][0].path?.startsWith('http') ? files[field][0].path : `/uploads/documents/${files[field][0].filename}`,
          filename: files[field][0].filename,
        };
      }
    });

    const owner = await Owner.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    res.json({ success: true, owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle active status
router.patch('/:id/status', adminProtect, async (req, res) => {
  try {
    const owner = await Owner.findById(req.params.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    owner.isActive = !owner.isActive;
    await owner.save();
    res.json({ success: true, isActive: owner.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete owner
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const owner = await Owner.findByIdAndDelete(req.params.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    res.json({ success: true, message: 'Owner deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
