const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Inquiry = require('../models/Inquiry');
const { adminProtect } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      const count = await Admin.countDocuments();
      if (count === 0) {
        admin = await Admin.create({ name: 'Super Admin', email, password, role: 'superadmin' });
        return res.json({ success: true, token: generateToken(admin._id), admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!(await admin.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    admin.lastLogin = Date.now();
    await admin.save();
    res.json({ success: true, token: generateToken(admin._id), admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role, photo: admin.photo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', adminProtect, (req, res) => res.json({ success: true, admin: req.admin }));

router.get('/dashboard', adminProtect, async (req, res) => {
  try {
    const [totalProperties, totalUsers, totalBookings, totalPayments, pendingInquiries, recentBookings, recentPayments] = await Promise.all([
      Property.countDocuments({ isActive: true }),
      User.countDocuments(),
      Booking.countDocuments(),
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Inquiry.countDocuments({ status: 'new' }),
      Booking.find().sort('-createdAt').limit(5).populate('property', 'title').populate('user', 'firstName lastName email'),
      Payment.find().sort('-createdAt').limit(5).populate('property', 'title').populate('user', 'firstName lastName'),
    ]);

    const monthlyBookings = await Booking.aggregate([
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    const propertyTypes = await Property.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);

    res.json({
      success: true,
      stats: {
        totalProperties,
        totalUsers,
        totalBookings,
        totalRevenue: totalPayments[0]?.total || 0,
        pendingInquiries,
      },
      recentBookings,
      recentPayments,
      monthlyBookings,
      propertyTypes,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const query = {};
    if (search) query.$or = [{ firstName: /search/i }, { lastName: /search/i }, { email: { $regex: search, $options: 'i' } }];
    if (status) query.status = status;
    const users = await User.find(query).sort('-createdAt').limit(limit * 1).skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    res.json({ success: true, users, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/status', adminProtect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users/:id', adminProtect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports', adminProtect, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [bookingTrends, revenueTrends, popularProperties, userGrowth] = await Promise.all([
      Booking.aggregate([{ $match: { createdAt: { $gte: start } } }, { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      Payment.aggregate([{ $match: { status: 'completed', createdAt: { $gte: start } } }, { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, revenue: { $sum: '$amount' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      Property.find({ isActive: true }).sort('-views -reviewCount').limit(10).select('title type views reviewCount rating address'),
      User.aggregate([{ $match: { createdAt: { $gte: start } } }, { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    ]);

    res.json({ success: true, bookingTrends, revenueTrends, popularProperties, userGrowth });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
