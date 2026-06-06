const mongoose = require('mongoose');

const servTransSchema = new mongoose.Schema({
  seqRef: { type: String, unique: true },
  // Linked entities
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyCode: { type: String, trim: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  tenantCode: { type: String, trim: true },
  // Request details (PDF: PI/PA/CL/DA/EL/OT, extended per prompt)
  requestType: {
    type: String,
    enum: ['plumbing', 'electrical', 'ac', 'cleaning', 'carpentry', 'painting', 'pest_control', 'maintenance', 'other'],
    required: true,
  },
  description: { type: String, trim: true, required: true },  // from tenant
  requestDate: { type: Date, default: Date.now },              // system login date
  // Workflow status (PDF: OP/IP/CL extended)
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'completed', 'closed'],
    default: 'open',
  },
  // Admin / technician fields
  attendedBy: { type: String, trim: true },     // PDF: Service Request Attended by
  startDate: { type: Date },                     // PDF: Service Request Start Date
  endDate: { type: Date },                       // PDF: Service Request End Date
  estimatedCost: { type: Number },               // PDF: Service Request Estimated Cost
  actualCost: { type: Number },                  // PDF: Service Request Actual Cost
  adminRemarks: { type: String, trim: true },    // PDF: Description (admin)
  // Before & after images
  beforeImages: [{ url: String, filename: String }],
  afterImages:  [{ url: String, filename: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

servTransSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.seqRef) {
    this.seqRef = 'SRV' + Date.now().toString().slice(-9);
  }
  next();
});

module.exports = mongoose.model('ServTrans', servTransSchema);
