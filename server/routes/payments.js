const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const { protect, adminProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

router.post('/', protect, upload.single('screenshot'), async (req, res) => {
  try {
    const data = { ...req.body, user: req.user._id };
    if (req.file) data.screenshotUrl = req.file.path?.startsWith('http') ? req.file.path : `/uploads/documents/${req.file.filename}`;

    const payment = await Payment.create(data);

    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await Notification.create({ recipient: admin._id, recipientModel: 'Admin', type: 'payment', title: 'New Payment Submitted', message: `Payment of ₹${data.amount} submitted by ${req.user.firstName}.` });
    }

    await Notification.create({ recipient: req.user._id, recipientModel: 'User', type: 'payment', title: 'Payment Submitted', message: `Your payment of ₹${data.amount} is under verification.` });

    const io = req.app.get('io');
    if (io) io.emit('admin_notification', { type: 'payment', message: 'New payment submitted' });

    res.status(201).json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).populate('property', 'title images').sort('-createdAt');
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = status ? { status } : {};
    const payments = await Payment.find(query).populate('property', 'title').populate('user', 'firstName lastName email').sort('-createdAt').limit(limit * 1).skip((page - 1) * limit);
    const total = await Payment.countDocuments(query);
    const revenue = await Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    res.json({ success: true, payments, total, pages: Math.ceil(total / limit), totalRevenue: revenue[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/verify', adminProtect, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, { status: req.body.status, verifiedBy: req.admin._id, verifiedAt: Date.now() }, { new: true }).populate('user');
    if (payment.booking) {
      await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: req.body.status === 'completed' ? 'paid' : 'pending' });
    }
    await Notification.create({ recipient: payment.user._id, recipientModel: 'User', type: 'payment', title: 'Payment ' + (req.body.status === 'completed' ? 'Confirmed' : 'Rejected'), message: `Your payment of ₹${payment.amount} has been ${req.body.status}.` });
    const io = req.app.get('io');
    if (io) io.to(payment.user._id.toString()).emit('notification', { type: 'payment', message: `Payment ${req.body.status}` });
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Razorpay: create order ────────────────────────────────────────────────
router.post('/razorpay/create-order', protect, async (req, res) => {
  try {
    const { amount, currency = 'INR', notes = {} } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const order = await getRazorpay().orders.create({
      amount: Math.round(amount * 100), // paise
      currency,
      notes,
      receipt: `rcpt_${Date.now()}`,
    });

    res.json({ success: true, order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Razorpay: verify payment signature & save record ─────────────────────
router.post('/razorpay/verify', protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      paymentType = 'booking_fee',
      property,
      booking,
      notes,
    } = req.body;

    // Signature verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
    }

    // Save verified payment
    const payment = await Payment.create({
      user: req.user._id,
      property,
      booking,
      amount,
      currency: 'INR',
      paymentType,
      paymentMode: 'online',
      transactionId: razorpay_payment_id,
      status: 'completed',
      notes: notes || `Razorpay Order: ${razorpay_order_id}`,
    });

    // Update booking payment status if linked
    if (booking) {
      await Booking.findByIdAndUpdate(booking, { paymentStatus: 'paid', paymentId: payment._id });
    }

    // Notify user
    await Notification.create({
      recipient: req.user._id,
      recipientModel: 'User',
      type: 'payment',
      title: 'Payment Successful',
      message: `Payment of ₹${amount} confirmed via Razorpay. Transaction ID: ${razorpay_payment_id}`,
    });

    // Notify admins
    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'payment',
        title: 'New Razorpay Payment',
        message: `₹${amount} received from ${req.user.firstName} ${req.user.lastName}. TxID: ${razorpay_payment_id}`,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('notification', { type: 'payment', message: 'Payment confirmed!' });
      io.emit('admin_notification', { type: 'payment', message: 'New Razorpay payment received' });
    }

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
