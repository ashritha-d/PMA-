const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const sendOTPEmail = async (toEmail, userName, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: `"PropManage" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Password Reset OTP – PropManage',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#f9f9f9;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:26px;margin:0;">Prop<span style="color:#e94560;">Manage</span></h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1a1a2e;margin-bottom:8px;">Hi ${userName},</h2>
          <p style="color:#555;margin-bottom:24px;">We received a request to reset your PropManage password. Use the OTP below — it expires in <strong>10 minutes</strong>.</p>
          <div style="background:#1a1a2e;color:#fff;font-size:36px;font-weight:700;letter-spacing:10px;text-align:center;padding:20px;border-radius:8px;margin-bottom:24px;">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        </div>
        <div style="background:#eee;padding:16px;text-align:center;font-size:12px;color:#999;">© 2026 PropManage. All rights reserved.</div>
      </div>
    `,
  });
};

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ firstName, lastName, email, password, phone });

    const admins = require('../models/Admin');
    const allAdmins = await admins.find({ isActive: true });
    for (const admin of allAdmins) {
      await Notification.create({ recipient: admin._id, recipientModel: 'Admin', type: 'user_registration', title: 'New User Registered', message: `${firstName} ${lastName} has registered.` });
    }
    const io = req.app.get('io');
    if (io) io.emit('admin_notification', { type: 'user_registration', message: `New user: ${firstName} ${lastName}` });

    res.status(201).json({ success: true, token: generateToken(user._id), user: { _id: user._id, firstName, lastName, email, phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Account blocked' });
    res.json({ success: true, token: generateToken(user._id), user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, photo: user.photo, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { firstName, lastName, phone }, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(oldPassword))) {
      return res.status(400).json({ success: false, message: 'Old password incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/favorites/:propertyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.favorites.indexOf(req.params.propertyId);
    if (idx > -1) user.favorites.splice(idx, 1);
    else user.favorites.push(req.params.propertyId);
    await user.save();
    res.json({ success: true, favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'No account found with this email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetOTP = otp;
    user.passwordResetExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(user.email, user.firstName, otp);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email, passwordResetOTP: otp, passwordResetExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/favorites', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    res.json({ success: true, favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
