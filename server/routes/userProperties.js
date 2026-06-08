const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Property = require('../models/Property');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ─── Field mapping helpers ────────────────────────────────────────────────────

const TYPE_MAP = {
  apartment: 'apartment', villa: 'villa', house: 'house',
  commercial: 'commercial', land: 'land', office: 'office',
  shop: 'shop', other: 'other', plot: 'plot', pg: 'pg',
};
// form sends capitalised values → store lowercase
const toDbType = (t = '') => TYPE_MAP[t.toLowerCase()] || 'other';

const STATUS_MAP = {
  available: 'Available', rented: 'Occupied', maintenance: 'Under Maintenance', sold: 'Occupied',
};
const toUserStatus = (s = '') => STATUS_MAP[s] || 'Available';

const DB_STATUS_MAP = {
  Available: 'available', Occupied: 'rented', 'Under Maintenance': 'maintenance',
};
const toDbStatus = (s = '') => DB_STATUS_MAP[s] || 'available';

const capitalize = (s = '') => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// Map a Property document → the user-property shape the frontend expects
const toUserFormat = (p) => ({
  _id: p._id,
  propertyName: p.title,
  propertyType: capitalize(p.type),
  description: p.description || '',
  status: toUserStatus(p.status),
  listingType: p.listingType || 'rent',
  country: p.address?.country || '',
  state: p.address?.state || '',
  city: p.address?.city || '',
  address: p.address?.line1 || '',
  pincode: p.address?.zipCode || '',
  googleMapsLocation: p.googleMapsLink || '',
  totalArea: p.features?.carpetArea || p.features?.builtupArea || null,
  bedrooms: p.features?.bedrooms || 0,
  bathrooms: p.features?.bathrooms || 0,
  floors: p.features?.totalFloors || 1,
  furnishing: capitalize(p.features?.furnished || 'Unfurnished'),
  parking: (p.features?.carParkings || 0) > 0,
  rentAmount: p.expectedRent || (p.listingType === 'rent' ? p.price : null) || null,
  securityDeposit: p.securityDeposit || null,
  maintenanceCharges: p.maintenanceCharges || null,
  salePrice: p.propertyValue || (p.listingType === 'sale' ? p.price : null) || null,
  images: (p.images || []).map(img => ({ url: img.url, filename: img.public_id || img.filename })),
  coverImage: p.coverImage || p.images?.[0]?.url || '',
  documents: p.documents || [],
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

// Map form data → Property document fields
const toPropertyFields = (body, userId) => {
  const listingType = body.listingType || 'rent';
  const rentAmt = Number(body.rentAmount) || 0;
  const saleAmt = Number(body.salePrice) || 0;

  return {
    title: body.propertyName,
    type: toDbType(body.propertyType),
    description: body.description || '',
    listingType,
    price: listingType === 'sale' ? saleAmt : rentAmt,
    priceUnit: listingType === 'sale' ? 'total' : 'month',
    expectedRent: rentAmt || null,
    propertyValue: saleAmt || null,
    securityDeposit: Number(body.securityDeposit) || null,
    maintenanceCharges: Number(body.maintenanceCharges) || null,
    status: toDbStatus(body.status),
    googleMapsLink: body.googleMapsLocation || '',
    address: {
      line1: body.address || '',
      city: body.city || '',
      state: body.state || '',
      country: body.country || 'India',
      zipCode: body.pincode || '',
    },
    features: {
      bedrooms: Number(body.bedrooms) || 0,
      bathrooms: Number(body.bathrooms) || 0,
      totalFloors: Number(body.floors) || 1,
      carpetArea: Number(body.totalArea) || null,
      builtupArea: Number(body.totalArea) || null,
      furnished: (body.furnishing || 'Unfurnished').toLowerCase(),
      carParkings: (body.parking === 'true' || body.parking === true) ? 1 : 0,
    },
    isActive: true,
    createdByUser: userId,
  };
};

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get('/my/stats', protect, async (req, res) => {
  try {
    const base = { createdByUser: req.user._id, isActive: true };
    const [total, available, occupied, maintenance] = await Promise.all([
      Property.countDocuments(base),
      Property.countDocuments({ ...base, status: 'available' }),
      Property.countDocuments({ ...base, status: 'rented' }),
      Property.countDocuments({ ...base, status: 'maintenance' }),
    ]);
    const incomeAgg = await Property.aggregate([
      { $match: { createdByUser: req.user._id, isActive: true, status: 'rented', listingType: 'rent' } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$expectedRent', '$price'] } } } },
    ]);
    res.json({ success: true, stats: { total, available, occupied, maintenance, monthlyIncome: incomeAgg[0]?.total || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── List ─────────────────────────────────────────────────────────────────────

router.get('/my', protect, async (req, res) => {
  try {
    const { search, status, type, sort = '-createdAt' } = req.query;
    const query = { createdByUser: req.user._id, isActive: true };
    if (status) query.status = toDbStatus(status);
    if (type) query.type = toDbType(type);
    if (search) query.title = { $regex: search, $options: 'i' };

    const properties = await Property.find(query).sort(sort).lean();
    res.json({ success: true, properties: properties.map(toUserFormat) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Single ───────────────────────────────────────────────────────────────────

router.get('/:id', protect, async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, createdByUser: req.user._id, isActive: true }).lean();
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    res.json({ success: true, property: toUserFormat(property) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────

router.post('/', protect, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
]), async (req, res) => {
  try {
    console.log('[UserProperty CREATE] user:', req.user._id, 'body:', JSON.stringify(req.body));

    const data = toPropertyFields(req.body, req.user._id);

    if (req.files?.images) {
      data.images = req.files.images.map(f => ({
        url: `/uploads/properties/${f.filename}`,
        public_id: f.filename,
      }));
      data.coverImage = req.body.coverImage || data.images[0]?.url || '';
    }

    if (req.files?.documents) {
      const docNames = [].concat(req.body.documentNames || []);
      const docTypes = [].concat(req.body.documentTypes || []);
      data.documents = req.files.documents.map((f, i) => ({
        name: docNames[i] || f.originalname,
        url: `/uploads/documents/${f.filename}`,
        filename: f.filename,
        docType: docTypes[i] || 'other',
      }));
    }

    const property = await Property.create(data);
    console.log('[UserProperty CREATE] saved _id:', property._id);

    // Emit socket update so /properties page refreshes in real-time
    const io = req.app.get('io');
    if (io) io.emit('property_update', { type: 'new', property });

    res.status(201).json({ success: true, property: toUserFormat(property) });
  } catch (err) {
    console.error('[UserProperty CREATE] error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Update ───────────────────────────────────────────────────────────────────

router.put('/:id', protect, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
]), async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, createdByUser: req.user._id, isActive: true });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const updates = toPropertyFields(req.body, req.user._id);

    // Merge new images with existing
    if (req.files?.images) {
      const newImages = req.files.images.map(f => ({
        url: `/uploads/properties/${f.filename}`,
        public_id: f.filename,
      }));
      updates.images = [...(property.images || []), ...newImages];
      if (!property.coverImage && updates.images.length > 0) {
        updates.coverImage = updates.images[0].url;
      }
    }
    if (req.body.coverImage) updates.coverImage = req.body.coverImage;

    // Merge new documents
    if (req.files?.documents) {
      const docNames = [].concat(req.body.documentNames || []);
      const docTypes = [].concat(req.body.documentTypes || []);
      const newDocs = req.files.documents.map((f, i) => ({
        name: docNames[i] || f.originalname,
        url: `/uploads/documents/${f.filename}`,
        filename: f.filename,
        docType: docTypes[i] || 'other',
      }));
      updates.documents = [...(property.documents || []), ...newDocs];
    }

    Object.assign(property, updates);
    await property.save();

    const io = req.app.get('io');
    if (io) io.emit('property_update', { type: 'update', property });

    res.json({ success: true, property: toUserFormat(property) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Status ───────────────────────────────────────────────────────────────────

router.put('/:id/status', protect, async (req, res) => {
  try {
    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, createdByUser: req.user._id, isActive: true },
      { status: toDbStatus(req.body.status) },
      { new: true }
    );
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const io = req.app.get('io');
    if (io) io.emit('property_update', { type: 'update', property });

    res.json({ success: true, property: toUserFormat(property) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Delete image ─────────────────────────────────────────────────────────────

router.delete('/:id/image/:index', protect, async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, createdByUser: req.user._id, isActive: true });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const idx = parseInt(req.params.index);
    const removed = property.images.splice(idx, 1);
    if (removed[0]?.public_id) {
      const fp = path.join(__dirname, '../uploads/properties', removed[0].public_id);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    if (property.coverImage === removed[0]?.url) {
      property.coverImage = property.images[0]?.url || '';
    }
    await property.save();
    res.json({ success: true, property: toUserFormat(property) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Delete document ──────────────────────────────────────────────────────────

router.delete('/:id/document/:index', protect, async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, createdByUser: req.user._id, isActive: true });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const idx = parseInt(req.params.index);
    const removed = property.documents.splice(idx, 1);
    if (removed[0]?.filename) {
      const fp = path.join(__dirname, '../uploads/documents', removed[0].filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await property.save();
    res.json({ success: true, property: toUserFormat(property) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Delete property ──────────────────────────────────────────────────────────

router.delete('/:id', protect, async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, createdByUser: req.user._id });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    // Delete image files
    (property.images || []).forEach(img => {
      if (img.public_id) {
        const fp = path.join(__dirname, '../uploads/properties', img.public_id);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    });
    // Delete document files
    (property.documents || []).forEach(doc => {
      if (doc.filename) {
        const fp = path.join(__dirname, '../uploads/documents', doc.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    });

    await property.deleteOne();

    const io = req.app.get('io');
    if (io) io.emit('property_update', { type: 'delete', propertyId: req.params.id });

    res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
