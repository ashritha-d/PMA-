const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { sanitizeError } = require('../utils/sanitizeError');
const { sendEmail } = require('../utils/email');

const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('phone').trim().matches(/^\+?[0-9]{10,15}$/).withMessage('Phone number must be 10-15 digits'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

// Stricter, dedicated limiter for credential/OTP-guessing-prone endpoints —
// the global 200-per-15-min limiter in server.js is shared across all API
// traffic and far too permissive for brute-forcing a single account.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

const sendOTPEmail = async (toEmail, userName, otp) => {
  await sendEmail({
    toEmail,
    toName: userName,
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

router.post('/register', registerValidation, handleValidation, async (req, res) => {
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
    if (io) io.to('admin-room').emit('admin_notification', { type: 'user_registration', message: `New user: ${firstName} ${lastName}` });

    res.status(201).json({ success: true, token: generateToken(user._id), user: { _id: user._id, firstName, lastName, email, phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || user.status === 'deleted' || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Account blocked' });
    res.json({ success: true, token: generateToken(user._id), user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, photo: user.photo, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
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
    res.status(500).json({ success: false, message: sanitizeError(err) });
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
    res.status(500).json({ success: false, message: sanitizeError(err) });
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
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  // Always return the same generic response whether or not the email is
  // registered, so this endpoint can't be used to enumerate accounts.
  const genericResponse = { success: true, message: 'If that email is registered, an OTP has been sent to it.' };
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json(genericResponse);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetOTP = otp;
    user.passwordResetExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(user.email, user.firstName, otp);
    res.json(genericResponse);
  } catch (err) {
    // Still avoid leaking whether the account exists or what failed internally.
    console.error('forgot-password error:', err.message);
    res.json(genericResponse);
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
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
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

router.get('/favorites', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    res.json({ success: true, favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
