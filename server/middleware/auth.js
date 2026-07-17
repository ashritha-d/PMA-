const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Tenant = require('../models/Tenant');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.status === 'deleted') return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ success: false, message: 'Account blocked' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

exports.adminProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ success: false, message: 'Admin not found' });
    if (!admin.isActive) return res.status(403).json({ success: false, message: 'Admin account deactivated' });
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Third, independent auth type — separate from both User (property
// browsers/buyers) and Admin. A tenant token only ever resolves against the
// Tenant collection, so it can't be used to access User/Admin-protected
// routes and vice versa, even though all three share the same JWT_SECRET.
exports.tenantProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tenant = await Tenant.findById(decoded.id);
    if (!tenant || !tenant.portalEnabled) return res.status(401).json({ success: false, message: 'Tenant not found' });
    req.tenant = tenant;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

exports.optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
  } catch (err) {}
  next();
};
