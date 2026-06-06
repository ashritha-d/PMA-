const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Property = require('../models/Property');
const { adminProtect } = require('../middleware/auth');

// List contracts
router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 15, search, status, expiringSoon, propertyCode } = req.query;
    const query = {};
    if (status) query.status = status;
    if (propertyCode) query.propertyCode = propertyCode;

    // Expiring within 30 days
    if (expiringSoon === 'true') {
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      query.contractEndDate = { $gte: now, $lte: in30 };
      query.status = 'active';
    }

    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { tenantName: { $regex: search, $options: 'i' } },
        { tenantCode: { $regex: search, $options: 'i' } },
        { propertyCode: { $regex: search, $options: 'i' } },
        { ownerCode: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Contract.countDocuments(query);
    const contracts = await Contract.find(query)
      .populate('propertyId', 'title propertyCode address')
      .populate('ownerId', 'firstName lastName ownerCode')
      .populate('tenantId', 'firstName lastName tenantCode')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, contracts, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Expiry counts (for dashboard badges)
router.get('/stats', adminProtect, async (req, res) => {
  try {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [active, expiringSoon, expired] = await Promise.all([
      Contract.countDocuments({ status: 'active' }),
      Contract.countDocuments({ status: 'active', contractEndDate: { $gte: now, $lte: in30 } }),
      Contract.countDocuments({ status: 'expired' }),
    ]);
    res.json({ success: true, active, expiringSoon, expired });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Single contract
router.get('/:id', adminProtect, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('propertyId', 'title propertyCode address type images')
      .populate('ownerId', 'firstName lastName salutation ownerCode mobile email')
      .populate('tenantId', 'firstName lastName salutation tenantCode mobile email')
      .populate('renewedFrom', 'contractNumber contractStartDate contractEndDate')
      .populate('createdBy', 'name');
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create contract
router.post('/', adminProtect, async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const contract = await Contract.create({ ...data, createdBy: req.admin._id });

    // Mark property as rented when contract is created
    if (contract.propertyId) {
      await Property.findByIdAndUpdate(contract.propertyId, { status: 'rented' });
    }

    res.status(201).json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update contract
router.put('/:id', adminProtect, async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('propertyId', 'title propertyCode').populate('tenantId', 'firstName lastName');
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Renew contract — creates a new contract copied from old, marks old as renewed
router.post('/:id/renew', adminProtect, async (req, res) => {
  try {
    const old = await Contract.findById(req.params.id);
    if (!old) return res.status(404).json({ success: false, message: 'Contract not found' });

    const { newEndDate, rentAmount } = req.body;
    if (!newEndDate) return res.status(400).json({ success: false, message: 'newEndDate is required' });

    // Mark original as renewed
    old.status = 'renewed';
    old.renewalDate = new Date();
    await old.save();

    const newContract = await Contract.create({
      propertyId: old.propertyId,
      propertyCode: old.propertyCode,
      ownerId: old.ownerId,
      ownerCode: old.ownerCode,
      tenantId: old.tenantId,
      tenantCode: old.tenantCode,
      tenantName: old.tenantName,
      contractStartDate: old.contractEndDate,
      contractEndDate: new Date(newEndDate),
      moveInDate: old.moveInDate,
      firstMoveInDate: old.firstMoveInDate || old.moveInDate,
      noticePeriod: old.noticePeriod,
      isNewTenant: false,
      rentAmount: rentAmount || old.rentAmount,
      rentDescription: old.rentDescription,
      rentPaymentMode: old.rentPaymentMode,
      rentPaymentType: old.rentPaymentType,
      depositAmount: old.depositAmount,
      depositPaymentMode: old.depositPaymentMode,
      status: 'active',
      renewedFrom: old._id,
      createdBy: req.admin._id,
    });

    res.status(201).json({ success: true, contract: newContract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Terminate contract
router.patch('/:id/terminate', adminProtect, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    contract.status = 'terminated';
    contract.contractTerminationDate = req.body.terminationDate ? new Date(req.body.terminationDate) : new Date();
    await contract.save();

    // Free up property on termination
    if (contract.propertyId) {
      await Property.findByIdAndUpdate(contract.propertyId, { status: 'available' });
    }

    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete contract
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, message: 'Contract deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
