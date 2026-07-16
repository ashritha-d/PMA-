const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const { adminProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sanitizeError } = require('../utils/sanitizeError');

const TENANT_DOC_FIELDS = [
  { name: 'passportCopy', maxCount: 1 },
  { name: 'eidCopy', maxCount: 1 },
  { name: 'residenceVisa', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 },
  { name: 'depositCheque', maxCount: 1 },
  { name: 'securityCheque', maxCount: 1 },
  { name: 'ejariRegistration', maxCount: 1 },
];

const attachDocs = (data, files) => {
  const docFields = ['passportCopy', 'eidCopy', 'residenceVisa', 'bankStatement', 'depositCheque', 'securityCheque', 'ejariRegistration'];
  docFields.forEach((field) => {
    if (files[field]?.[0]) {
      data[field] = {
        url: files[field][0].path?.startsWith('http') ? files[field][0].path : `/uploads/documents/${files[field][0].filename}`,
        filename: files[field][0].filename,
      };
    }
  });
};

// List tenants
router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 15, search, status, propertyCode } = req.query;
    const query = {};
    if (status) query.status = status;
    if (propertyCode) query.propertyCode = propertyCode;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { tenantCode: { $regex: search, $options: 'i' } },
        { passportNumber: { $regex: search, $options: 'i' } },
        { propertyCode: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await Tenant.countDocuments(query);
    const tenants = await Tenant.find(query)
      .populate('propertyId', 'title propertyCode address')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    res.json({ success: true, tenants, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Get single tenant
router.get('/:id', adminProtect, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('propertyId', 'title propertyCode address type images')
      .populate('createdBy', 'name');
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    res.json({ success: true, tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Create tenant
router.post('/', adminProtect, upload.fields(TENANT_DOC_FIELDS), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    attachDocs(data, req.files || {});
    const tenant = await Tenant.create({ ...data, createdBy: req.admin._id });

    // Mark property as rented if propertyId provided
    if (tenant.propertyId) {
      await Property.findByIdAndUpdate(tenant.propertyId, { status: 'rented' });
    }

    res.status(201).json({ success: true, tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Update tenant
router.put('/:id', adminProtect, upload.fields(TENANT_DOC_FIELDS), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    attachDocs(data, req.files || {});
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('propertyId', 'title propertyCode address');
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    res.json({ success: true, tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Toggle status (active ↔ former)
router.patch('/:id/status', adminProtect, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    tenant.status = tenant.status === 'active' ? 'former' : 'active';
    tenant.isActive = tenant.status === 'active';
    await tenant.save();
    res.json({ success: true, status: tenant.status, isActive: tenant.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Delete tenant
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    // Free up the property
    if (tenant.propertyId) {
      await Property.findByIdAndUpdate(tenant.propertyId, { status: 'available' });
    }
    res.json({ success: true, message: 'Tenant deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
