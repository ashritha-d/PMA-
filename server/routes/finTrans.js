const express = require('express');
const router = express.Router();
const FinTrans = require('../models/FinTrans');
const { adminProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sanitizeError } = require('../utils/sanitizeError');

// Summary stats (receipts, payments, net) with optional filters
router.get('/summary', adminProtect, async (req, res) => {
  try {
    const { propertyCode, dateFrom, dateTo } = req.query;
    const match = {};
    if (propertyCode) match.propertyCode = propertyCode;
    if (dateFrom || dateTo) {
      match.transactionDate = {};
      if (dateFrom) match.transactionDate.$gte = new Date(dateFrom);
      if (dateTo)   match.transactionDate.$lte = new Date(dateTo);
    }

    const [result] = await FinTrans.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: { $cond: [{ $eq: ['$transactionNature', 'receipt'] }, '$amount', 0] } },
          totalPayments: { $sum: { $cond: [{ $eq: ['$transactionNature', 'payment'] }, '$amount', 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalReceipts = result?.totalReceipts || 0;
    const totalPayments = result?.totalPayments || 0;
    res.json({ success: true, totalReceipts, totalPayments, netBalance: totalReceipts - totalPayments, count: result?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Monthly breakdown (for charts / reports)
router.get('/monthly', adminProtect, async (req, res) => {
  try {
    const { propertyCode, year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const match = {
      transactionDate: { $gte: new Date(`${y}-01-01`), $lte: new Date(`${y}-12-31`) },
    };
    if (propertyCode) match.propertyCode = propertyCode;

    const rows = await FinTrans.aggregate([
      { $match: match },
      {
        $group: {
          _id: { month: { $month: '$transactionDate' }, nature: '$transactionNature' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    // Shape into 12-month array
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, receipts: 0, payments: 0 }));
    rows.forEach(r => {
      const m = months[r._id.month - 1];
      if (r._id.nature === 'receipt') m.receipts = r.total;
      else m.payments = r.total;
    });
    res.json({ success: true, months });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// List transactions
router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, propertyCode, transactionType, transactionNature, paymentMode, chequeStatus, dateFrom, dateTo } = req.query;
    const query = {};
    if (propertyCode) query.propertyCode = propertyCode;
    if (transactionType) query.transactionType = transactionType;
    if (transactionNature) query.transactionNature = transactionNature;
    if (paymentMode) query.paymentMode = paymentMode;
    if (chequeStatus) query.chequeStatus = chequeStatus;
    if (dateFrom || dateTo) {
      query.transactionDate = {};
      if (dateFrom) query.transactionDate.$gte = new Date(dateFrom);
      if (dateTo)   query.transactionDate.$lte = new Date(dateTo);
    }
    if (search) {
      query.$or = [
        { finTransRef: { $regex: search, $options: 'i' } },
        { propertyCode: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { bankName: { $regex: search, $options: 'i' } },
        { tenantCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await FinTrans.countDocuments(query);
    const transactions = await FinTrans.find(query)
      .populate('propertyId', 'title propertyCode')
      .populate('tenantId', 'firstName lastName')
      .populate('ownerId', 'firstName lastName')
      .populate('createdBy', 'name')
      .sort('-transactionDate')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, transactions, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Single transaction
router.get('/:id', adminProtect, async (req, res) => {
  try {
    const tx = await FinTrans.findById(req.params.id)
      .populate('propertyId', 'title propertyCode address')
      .populate('tenantId', 'firstName lastName tenantCode')
      .populate('ownerId', 'firstName lastName ownerCode')
      .populate('contractId', 'contractNumber')
      .populate('createdBy', 'name');
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Create transaction (with optional cheque image)
router.post('/', adminProtect, upload.single('chequeImage'), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    if (req.file) {
      data.chequeImage = { url: req.file.path?.startsWith('http') ? req.file.path : `/uploads/documents/${req.file.filename}`, filename: req.file.filename };
    }
    const tx = await FinTrans.create({ ...data, createdBy: req.admin._id });
    res.status(201).json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Update transaction
router.put('/:id', adminProtect, upload.single('chequeImage'), async (req, res) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    if (req.file) {
      data.chequeImage = { url: req.file.path?.startsWith('http') ? req.file.path : `/uploads/documents/${req.file.filename}`, filename: req.file.filename };
    }
    const tx = await FinTrans.findByIdAndUpdate(req.params.id, { ...data, updatedAt: Date.now() }, { new: true, runValidators: true });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Update cheque status only
router.patch('/:id/cheque-status', adminProtect, async (req, res) => {
  try {
    const { chequeStatus } = req.body;
    if (!['pending', 'cleared', 'bounced'].includes(chequeStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid cheque status' });
    }
    const tx = await FinTrans.findByIdAndUpdate(req.params.id, { chequeStatus, updatedAt: Date.now() }, { new: true });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// Delete transaction
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const tx = await FinTrans.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
