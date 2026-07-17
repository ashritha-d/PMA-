const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const rateLimit = require('express-rate-limit');
const Tenant = require('../models/Tenant');
const FinTrans = require('../models/FinTrans');
const { tenantProtect, adminProtect } = require('../middleware/auth');
const { sanitizeError } = require('../utils/sanitizeError');
const { sendEmail } = require('../utils/email');

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// Same rate-limit shape as routes/auth.js's authLimiter — a login endpoint
// is a credential-guessing target, the shared 200/15min API limiter isn't
// tight enough on its own.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/tenant-portal/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const tenant = await Tenant.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!tenant || !tenant.portalEnabled || !(await tenant.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: generateToken(tenant._id),
      tenant: { _id: tenant._id, firstName: tenant.firstName, lastName: tenant.lastName, email: tenant.email, tenantCode: tenant.tenantCode },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// POST /api/tenant-portal/invite/:tenantId — admin-triggered
router.post('/invite/:tenantId', adminProtect, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    if (!tenant.email) return res.status(400).json({ success: false, message: 'Tenant has no email on file' });

    const tempPassword = crypto.randomBytes(6).toString('base64url'); // ~8 readable chars
    tenant.password = tempPassword; // hashed by the pre('save') hook
    tenant.portalEnabled = true;
    await tenant.save();

    await sendEmail({
      toEmail: tenant.email,
      toName: `${tenant.firstName} ${tenant.lastName}`,
      subject: 'Your PropManage Tenant Portal Access',
      html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#f9f9f9;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:26px;margin:0;">Prop<span style="color:#e94560;">Manage</span></h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1a1a2e;margin-bottom:8px;">Hi ${tenant.firstName},</h2>
          <p style="color:#555;margin-bottom:24px;">You now have access to the PropManage Tenant Portal, where you can view your lease and pay rent online.</p>
          <p style="color:#555;margin-bottom:6px;"><strong>Email:</strong> ${tenant.email}</p>
          <div style="background:#1a1a2e;color:#fff;font-size:22px;font-weight:700;letter-spacing:2px;text-align:center;padding:16px;border-radius:8px;margin-bottom:24px;">
            ${tempPassword}
          </div>
          <p style="color:#888;font-size:13px;">Please log in and change your password from the portal. If you weren't expecting this, contact your property manager.</p>
        </div>
        <div style="background:#eee;padding:16px;text-align:center;font-size:12px;color:#999;">© 2026 PropManage. All rights reserved.</div>
      </div>
      `,
    });

    res.json({ success: true, message: 'Invite sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// GET /api/tenant-portal/me
router.get('/me', tenantProtect, async (req, res) => {
  try {
    const [tenant, payments] = await Promise.all([
      Tenant.findById(req.tenant._id).populate('propertyId', 'title address images'),
      FinTrans.find({ tenantId: req.tenant._id, transactionNature: 'receipt' })
        .sort('-transactionDate')
        .select('finTransRef transactionType amount transactionDate paymentMode description'),
    ]);
    res.json({ success: true, tenant, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// PUT /api/tenant-portal/change-password
router.put('/change-password', tenantProtect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    const tenant = await Tenant.findById(req.tenant._id).select('+password');
    if (!(await tenant.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    tenant.password = newPassword;
    await tenant.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// POST /api/tenant-portal/razorpay/create-order
router.post('/razorpay/create-order', tenantProtect, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const order = await getRazorpay().orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      notes: { tenantId: req.tenant._id.toString(), tenantCode: req.tenant.tenantCode },
      receipt: `rent_${Date.now()}`,
    });

    res.json({ success: true, order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// POST /api/tenant-portal/razorpay/verify
router.post('/razorpay/verify', tenantProtect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Signature verification — proves order_id/payment_id are a genuine,
    // unmodified pair signed by Razorpay. Mirrors routes/payments.js exactly.
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
    }

    // Idempotency: a resubmission of an already-verified payment must not
    // create a second FinTrans record.
    const existing = await FinTrans.findOne({ referenceNumber: razorpay_payment_id });
    if (existing) {
      return res.json({ success: true, transaction: existing });
    }

    // Authoritative amount comes from Razorpay, never the client.
    const rpPayment = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (rpPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Payment verification failed — order mismatch' });
    }
    if (rpPayment.status !== 'captured') {
      return res.status(400).json({ success: false, message: `Payment not captured (status: ${rpPayment.status})` });
    }
    const verifiedAmount = rpPayment.amount / 100;

    // No client-submitted tenant/property id is trusted anywhere in this
    // route — everything comes from req.tenant, resolved from the verified
    // JWT, so a tenant can only ever create a FinTrans record against their
    // own record.
    const transaction = await FinTrans.create({
      propertyId: req.tenant.propertyId,
      propertyCode: req.tenant.propertyCode,
      tenantId: req.tenant._id,
      tenantCode: req.tenant.tenantCode,
      transactionType: 'rent',
      transactionNature: 'receipt',
      paymentMode: 'online',
      transactionDate: new Date(),
      amount: verifiedAmount,
      referenceNumber: razorpay_payment_id,
      description: `Online rent payment via tenant portal — ${req.tenant.tenantCode} (Razorpay order: ${razorpay_order_id})`,
    });

    res.json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
