const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const { protect, adminProtect } = require('../middleware/auth');
const { sanitizeError } = require('../utils/sanitizeError');

router.post('/', protect, async (req, res) => {
  try {
    const { property, bookingType, visitDate, visitTime } = req.body;

    // Prevent submitting the exact same visit request twice (same user,
    // property, type, date and time) while a prior request is still active.
    const duplicate = await Booking.findOne({
      user: req.user._id,
      property,
      bookingType,
      visitDate,
      visitTime,
      status: { $nin: ['cancelled', 'rejected'] },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'You already have an active booking request for this property, date and time.' });
    }

    const booking = await Booking.create({ ...req.body, user: req.user._id });
    await booking.populate(['property', 'user']);

    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await Notification.create({ recipient: admin._id, recipientModel: 'Admin', type: 'booking', title: 'New Booking Request', message: `${req.user.firstName} booked a visit for "${booking.property?.title}"` });
    }

    await Notification.create({ recipient: req.user._id, recipientModel: 'User', type: 'booking', title: 'Booking Received', message: `Your visit request has been received. We'll confirm soon.` });

    const io = req.app.get('io');
    if (io) io.to('admin-room').emit('admin_notification', { type: 'booking', message: 'New booking request' });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate('property', 'title images address price').sort('-createdAt');
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = status ? { status } : {};
    const bookings = await Booking.find(query).populate('property', 'title images').populate('user', 'firstName lastName email phone').sort('-createdAt').limit(limit * 1).skip((page - 1) * limit);
    const total = await Booking.countDocuments(query);
    res.json({ success: true, bookings, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.put('/:id/status', adminProtect, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status, adminNote: req.body.adminNote }, { new: true }).populate('user', 'firstName');
    await Notification.create({ recipient: booking.user._id, recipientModel: 'User', type: 'booking', title: 'Booking Status Updated', message: `Your booking has been ${req.body.status}.` });
    const io = req.app.get('io');
    if (io) io.to(booking.user._id.toString()).emit('notification', { type: 'booking', message: `Booking ${req.body.status}` });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    await Booking.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
