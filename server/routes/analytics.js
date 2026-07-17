const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const FinTrans = require('../models/FinTrans');
const Tenant = require('../models/Tenant');
const Contract = require('../models/Contract');
const ServTrans = require('../models/ServTrans');
const PurchaseContract = require('../models/PurchaseContract');
const analyticsAuth = require('../middleware/analyticsAuth');
const { escapeRegex } = require('../utils/escapeRegex');
const { sanitizeError } = require('../utils/sanitizeError');

// Power BI-friendly read-only analytics API. Every route here is
// aggregation-only (no writes) and sits behind analyticsAuth, not the
// admin/user JWT middleware used everywhere else — see
// server/middleware/analyticsAuth.js for why a scheduled-refresh BI tool
// needs a non-expiring credential instead.

const dateMatch = (field, query) => {
  const match = {};
  if (query.from || query.to) {
    match[field] = {};
    if (query.from) match[field].$gte = new Date(query.from);
    if (query.to) match[field].$lte = new Date(query.to);
  }
  return match;
};

const paginate = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 20);
  return { page, limit, skip: (page - 1) * limit };
};

// GET /api/analytics/dashboard — Executive Overview
router.get('/dashboard', analyticsAuth, async (req, res) => {
  try {
    const revenueMatch = { transactionNature: 'receipt', ...dateMatch('transactionDate', req.query) };

    const [propertyFacet, activeBookings, monthlyRevenue, totalRevenueAgg, pendingPaymentsAgg, activeTenants, maintenanceRequests] = await Promise.all([
      Property.aggregate([
        { $match: { isActive: true } },
        { $facet: {
          byListing: [{ $group: { _id: '$listingType', count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          avgPrice: [{ $group: { _id: '$listingType', avg: { $avg: '$price' } } }],
        }},
      ]),
      Booking.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
      FinTrans.aggregate([
        { $match: revenueMatch },
        { $group: { _id: { y: { $year: '$transactionDate' }, m: { $month: '$transactionDate' } }, total: { $sum: '$amount' } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      FinTrans.aggregate([{ $match: { transactionNature: 'receipt' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Tenant.countDocuments({ status: 'active' }),
      ServTrans.countDocuments(),
    ]);

    res.json({
      success: true,
      properties: propertyFacet[0],
      activeBookings,
      monthlyRevenue,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      pendingPayments: { total: pendingPaymentsAgg[0]?.total || 0, count: pendingPaymentsAgg[0]?.count || 0 },
      activeTenants,
      maintenanceRequests,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// GET /api/analytics/properties — Property Analytics
router.get('/properties', analyticsAuth, async (req, res) => {
  try {
    const match = { isActive: true };
    if (req.query.city) match['address.city'] = new RegExp(`^${escapeRegex(req.query.city)}$`, 'i');
    if (req.query.type) match.type = req.query.type;
    if (req.query.status) match.status = req.query.status;

    const [distribution] = await Property.aggregate([
      { $match: match },
      { $facet: {
        byCity:      [{ $group: { _id: '$address.city', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } }, { $sort: { count: -1 } }],
        byState:     [{ $group: { _id: '$address.state', count: { $sum: 1 } } }],
        byCountry:   [{ $group: { _id: '$address.country', count: { $sum: 1 } } }],
        byType:      [{ $group: { _id: '$type', count: { $sum: 1 } } }],
        byBedrooms:  [{ $group: { _id: '$features.bedrooms', count: { $sum: 1 } } }],
        byBathrooms: [{ $group: { _id: '$features.bathrooms', count: { $sum: 1 } } }],
        byFurnished: [{ $group: { _id: '$features.furnished', count: { $sum: 1 } } }],
      }},
    ]);

    res.json({ success: true, distribution });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// GET /api/analytics/bookings — Booking Analytics
router.get('/bookings', analyticsAuth, async (req, res) => {
  try {
    const baseMatch = { ...dateMatch('createdAt', req.query) };
    if (req.query.status) baseMatch.status = req.query.status;

    const [funnel, dailyTrend, avgValueAgg] = await Promise.all([
      Booking.aggregate([{ $match: baseMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $match: baseMatch },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
      ]),
      Booking.aggregate([
        { $match: baseMatch },
        { $lookup: { from: 'payments', localField: 'paymentId', foreignField: '_id', as: 'payment' } },
        { $unwind: '$payment' },
        { $group: { _id: null, avg: { $avg: '$payment.amount' } } },
      ]),
    ]);

    const total = funnel.reduce((s, f) => s + f.count, 0);
    const completed = funnel.find(f => f._id === 'completed')?.count || 0;
    const cancelled = funnel.find(f => f._id === 'cancelled')?.count || 0;

    res.json({
      success: true,
      funnel,
      dailyTrend,
      totalBookings: total,
      cancelledBookings: cancelled,
      avgBookingValue: avgValueAgg[0]?.avg || 0,
      conversionRate: total ? +(completed / total * 100).toFixed(1) : 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// GET /api/analytics/revenue — Revenue & Finance
router.get('/revenue', analyticsAuth, async (req, res) => {
  try {
    const finMatch = dateMatch('transactionDate', req.query);
    const paymentMatch = dateMatch('createdAt', req.query);

    const [rentLedger, paymentStatus, salesRevenueAgg] = await Promise.all([
      FinTrans.aggregate([
        { $match: finMatch },
        { $group: {
          _id: { nature: '$transactionNature', type: '$transactionType', y: { $year: '$transactionDate' }, m: { $month: '$transactionDate' } },
          total: { $sum: '$amount' },
        }},
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Payment.aggregate([{ $match: paymentMatch }, { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      PurchaseContract.aggregate([
        { $match: { status: { $in: ['active', 'completed'] } } },
        { $group: { _id: null, advance: { $sum: '$advanceAmount' }, balance: { $sum: '$balanceAmount' }, price: { $sum: '$purchasePrice' } } },
      ]),
    ]);

    res.json({
      success: true,
      rentLedger,
      paymentStatus,
      salesRevenue: salesRevenueAgg[0] || { advance: 0, balance: 0, price: 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// GET /api/analytics/tenants — Tenant Analytics
router.get('/tenants', analyticsAuth, async (req, res) => {
  try {
    const statusMatch = req.query.status ? { status: req.query.status } : {};
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 86400000);

    const [byStatus, expiringWithin60Days, totalRenewals, growthTrend] = await Promise.all([
      Tenant.aggregate([{ $match: statusMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Contract.countDocuments({ status: 'active', contractEndDate: { $lte: in60, $gte: now } }),
      Contract.countDocuments({ renewedFrom: { $ne: null } }),
      Tenant.aggregate([
        { $match: { ...statusMatch, ...dateMatch('createdAt', req.query) } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
    ]);

    res.json({ success: true, byStatus, expiringWithin60Days, totalRenewals, growthTrend });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// GET /api/analytics/maintenance — Maintenance Analytics
router.get('/maintenance', analyticsAuth, async (req, res) => {
  try {
    const baseMatch = { ...dateMatch('createdAt', req.query) };
    if (req.query.status) baseMatch.status = req.query.status;
    if (req.query.priority) baseMatch.priority = req.query.priority;
    const { page, limit, skip } = paginate(req.query);

    const [byStatus, byPriority, resolutionAgg, byAttendee, monthlyTrend, overdueCount] = await Promise.all([
      ServTrans.aggregate([{ $match: baseMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      ServTrans.aggregate([{ $match: baseMatch }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      ServTrans.aggregate([
        { $match: { ...baseMatch, resolvedAt: { $ne: null } } },
        { $group: { _id: null, avgHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } } },
      ]),
      ServTrans.aggregate([
        { $match: { ...baseMatch, attendedBy: { $nin: [null, ''] } } },
        { $group: { _id: '$attendedBy', total: { $sum: 1 }, avgHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } } },
        { $sort: { total: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      ServTrans.aggregate([
        { $match: baseMatch },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      ServTrans.countDocuments({ ...baseMatch, resolvedAt: null, slaDueAt: { $lt: new Date() } }),
    ]);

    res.json({
      success: true,
      byStatus,
      byPriority,
      avgResolutionHours: resolutionAgg[0]?.avgHours || 0,
      overdueCount,
      byAttendee,
      monthlyTrend,
      page,
      limit,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
