const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const PurchaseContract = require('../models/PurchaseContract');
const ContractSignature = require('../models/ContractSignature');
const ContractPayment = require('../models/ContractPayment');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const { protect, adminProtect } = require('../middleware/auth');

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/purchase-contracts — buyer initiates
router.post('/', protect, async (req, res) => {
  try {
    const { propertyId, advanceAmount, handoverDate, paymentSchedule } = req.body;

    const property = await Property.findById(propertyId)
      .populate('createdByUser', 'firstName lastName email phone');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const purchasePrice = property.price;
    const advance = Number(advanceAmount) || 0;
    const balance = purchasePrice - advance;

    const addrParts = [property.address?.line1, property.address?.city, property.address?.state].filter(Boolean);

    // Resolve owner info: prefer ownerInfo, fallback to createdByUser
    const ownerUser = property.createdByUser;
    const ownerName = property.ownerInfo?.name || (ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : '');
    const ownerEmail = property.ownerInfo?.email || ownerUser?.email || '';
    const ownerPhone = property.ownerInfo?.phone || ownerUser?.phone || '';

    const contract = await PurchaseContract.create({
      propertyId,
      buyerId: req.user._id,
      ownerId: ownerUser?._id || undefined,
      purchasePrice,
      advanceAmount: advance,
      balanceAmount: balance,
      handoverDate: handoverDate || null,
      paymentSchedule: paymentSchedule || [],
      status: 'draft',
      propertyTitle: property.title,
      propertyAddress: addrParts.join(', '),
      propertyCode: property.propertyCode,
      buyerName: `${req.user.firstName} ${req.user.lastName}`,
      buyerEmail: req.user.email,
      buyerPhone: req.user.phone || '',
      ownerName,
      ownerEmail,
      ownerPhone,
      auditLog: [{
        action: 'contract_created',
        performedBy: req.user._id,
        performedByName: `${req.user.firstName} ${req.user.lastName}`,
        performedByRole: 'buyer',
        notes: 'Contract initiated by buyer',
      }],
    });

    // Notify admins
    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'system',
        title: 'New Purchase Contract',
        message: `${req.user.firstName} initiated a purchase contract for "${property.title}"`,
      });
    }

    const io = req.app.get('io');
    if (io) io.emit('admin_notification', { type: 'contract', message: 'New purchase contract created' });

    res.status(201).json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/purchase-contracts/my — buyer's contracts
router.get('/my', protect, async (req, res) => {
  try {
    const contracts = await PurchaseContract.find({ buyerId: req.user._id })
      .select('-auditLog -paymentSchedule')
      .sort('-createdAt');
    res.json({ success: true, contracts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/purchase-contracts/owner — owner's contracts (properties the user owns)
router.get('/owner', protect, async (req, res) => {
  try {
    // Match by email in ownerEmail (since owners may not have user accounts)
    const contracts = await PurchaseContract.find({ ownerEmail: req.user.email })
      .select('-auditLog')
      .sort('-createdAt');
    res.json({ success: true, contracts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/purchase-contracts/admin/all — admin: all contracts
router.get('/admin/all', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { status } : {};
    const contracts = await PurchaseContract.find(query)
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await PurchaseContract.countDocuments(query);
    res.json({ success: true, contracts, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/purchase-contracts/:id — get single contract (participants only)
router.get('/:id', protect, async (req, res) => {
  try {
    const contract = await PurchaseContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const isBuyer = contract.buyerId.toString() === req.user._id.toString();
    const isOwner = contract.ownerEmail === req.user.email;
    if (!isBuyer && !isOwner) return res.status(403).json({ success: false, message: 'Access denied' });

    const signatures = await ContractSignature.find({ contractId: contract._id }).select('-signatureData');
    const payments = await ContractPayment.find({ contractId: contract._id });
    res.json({ success: true, contract, signatures, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/purchase-contracts/:id/accept-terms — buyer accepts terms
router.put('/:id/accept-terms', protect, async (req, res) => {
  try {
    const contract = await PurchaseContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const isBuyer = contract.buyerId.toString() === req.user._id.toString();
    if (!isBuyer) return res.status(403).json({ success: false, message: 'Only the buyer can accept terms' });

    contract.buyerTermsAcceptedAt = new Date();
    contract.status = 'pending_signatures';
    contract.auditLog.push({
      action: 'terms_accepted',
      performedBy: req.user._id,
      performedByName: `${req.user.firstName} ${req.user.lastName}`,
      performedByRole: 'buyer',
      notes: 'Buyer accepted terms and conditions',
    });
    await contract.save();
    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchase-contracts/:id/sign — sign digitally
router.post('/:id/sign', protect, async (req, res) => {
  try {
    const { signatureData } = req.body;
    if (!signatureData) return res.status(400).json({ success: false, message: 'Signature data required' });

    const contract = await PurchaseContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const isBuyer = contract.buyerId.toString() === req.user._id.toString();
    if (!isBuyer) return res.status(403).json({ success: false, message: 'Only the buyer can sign here' });

    if (!contract.advancePaid) return res.status(400).json({ success: false, message: 'Advance payment must be completed before signing' });
    if (contract.buyerSignedAt) return res.status(400).json({ success: false, message: 'Already signed' });

    await ContractSignature.create({
      contractId: contract._id,
      userId: req.user._id,
      role: 'buyer',
      signatureData,
      signerName: `${req.user.firstName} ${req.user.lastName}`,
    });

    contract.buyerSignedAt = new Date();
    contract.auditLog.push({
      action: 'buyer_signed',
      performedBy: req.user._id,
      performedByName: `${req.user.firstName} ${req.user.lastName}`,
      performedByRole: 'buyer',
      notes: 'Buyer signed the contract digitally',
    });
    await contract.save();

    // Notify admins to review
    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'system',
        title: 'Contract Signed by Buyer',
        message: `Contract ${contract.contractNumber} has been signed by the buyer. Awaiting admin approval.`,
      });
    }

    const io = req.app.get('io');
    if (io) io.emit('admin_notification', { type: 'contract', message: 'Contract signed by buyer' });

    res.json({ success: true, contract, message: 'Contract signed successfully. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/purchase-contracts/:id/status — admin updates status
router.put('/:id/status', adminProtect, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const contract = await PurchaseContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    contract.status = status;
    if (status === 'active') {
      contract.ownerSignedAt = new Date();
      contract.ownerTermsAcceptedAt = new Date();
    }
    contract.auditLog.push({
      action: `status_changed_to_${status}`,
      performedByName: req.admin.name,
      performedByRole: 'admin',
      notes: notes || `Admin changed status to ${status}`,
    });
    await contract.save();

    // Notify buyer
    await Notification.create({
      recipient: contract.buyerId,
      recipientModel: 'User',
      type: 'system',
      title: 'Purchase Contract Update',
      message: `Your contract ${contract.contractNumber} status has been updated to: ${status.replace('_', ' ')}.`,
    });

    const io = req.app.get('io');
    if (io) io.to(contract.buyerId.toString()).emit('notification', { type: 'contract', message: `Contract ${status}` });

    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchase-contracts/:id/razorpay/create-order — create advance payment order
router.post('/:id/razorpay/create-order', protect, async (req, res) => {
  try {
    const contract = await PurchaseContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const isBuyer = contract.buyerId.toString() === req.user._id.toString();
    if (!isBuyer) return res.status(403).json({ success: false, message: 'Access denied' });

    if (contract.advancePaid) return res.status(400).json({ success: false, message: 'Advance already paid' });
    if (contract.advanceAmount <= 0) return res.status(400).json({ success: false, message: 'No advance amount set on this contract' });

    const order = await getRazorpay().orders.create({
      amount: Math.round(contract.advanceAmount * 100), // paise
      currency: 'INR',
      receipt: `adv_${contract.contractNumber}`,
      notes: { contractNumber: contract.contractNumber, type: 'advance_payment' },
    });

    res.json({ success: true, order, key: process.env.RAZORPAY_KEY_ID, contract: { contractNumber: contract.contractNumber, advanceAmount: contract.advanceAmount, propertyTitle: contract.propertyTitle } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchase-contracts/:id/razorpay/verify — verify & unlock signing
router.post('/:id/razorpay/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const contract = await PurchaseContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const isBuyer = contract.buyerId.toString() === req.user._id.toString();
    if (!isBuyer) return res.status(403).json({ success: false, message: 'Access denied' });

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
    }

    // Mark advance as paid — unlock signing
    contract.advancePaid = true;
    contract.advancePaymentId = razorpay_payment_id;
    contract.advancePaidAt = new Date();
    contract.auditLog.push({
      action: 'advance_paid',
      performedBy: req.user._id,
      performedByName: `${req.user.firstName} ${req.user.lastName}`,
      performedByRole: 'buyer',
      notes: `Advance of ₹${contract.advanceAmount} paid via Razorpay. TxID: ${razorpay_payment_id}`,
    });
    await contract.save();

    // Record in ContractPayment
    await ContractPayment.create({
      contractId: contract._id,
      amount: contract.advanceAmount,
      paymentType: 'advance',
      paymentMode: 'online',
      transactionId: razorpay_payment_id,
      status: 'paid',
      paidAt: new Date(),
      notes: `Advance payment via Razorpay — Order: ${razorpay_order_id}`,
    });

    // Notify buyer
    await Notification.create({
      recipient: req.user._id,
      recipientModel: 'User',
      type: 'payment',
      title: 'Advance Payment Confirmed',
      message: `Advance of ₹${contract.advanceAmount} for contract ${contract.contractNumber} confirmed. You can now sign the contract.`,
    });

    // Notify admins
    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'payment',
        title: 'Contract Advance Received',
        message: `₹${contract.advanceAmount} advance paid for contract ${contract.contractNumber} by ${req.user.firstName} ${req.user.lastName}.`,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('notification', { type: 'payment', message: 'Advance payment confirmed!' });
      io.emit('admin_notification', { type: 'payment', message: 'Contract advance payment received' });
    }

    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/purchase-contracts/:id/audit — audit log (admin)
router.get('/:id/audit', adminProtect, async (req, res) => {
  try {
    const contract = await PurchaseContract.findById(req.params.id).select('contractNumber auditLog');
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, auditLog: contract.auditLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchase-contracts/:id/payments — record a payment
router.post('/:id/payments', protect, async (req, res) => {
  try {
    const contract = await PurchaseContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const isBuyer = contract.buyerId.toString() === req.user._id.toString();
    if (!isBuyer) return res.status(403).json({ success: false, message: 'Access denied' });

    const payment = await ContractPayment.create({ contractId: contract._id, ...req.body });
    res.status(201).json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
