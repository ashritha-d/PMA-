const mongoose = require('mongoose');

const SLA_HOURS = { emergency: 4, high: 24, medium: 72, low: 168 };

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
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium',
  },
  slaDueAt: { type: Date },
  resolvedAt: { type: Date },
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
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

servTransSchema.virtual('isOverdue').get(function () {
  return !this.resolvedAt && !!this.slaDueAt && this.slaDueAt.getTime() < Date.now();
});

servTransSchema.index({ status: 1 });
servTransSchema.index({ priority: 1 });
servTransSchema.index({ createdAt: -1 });

servTransSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.seqRef) {
    this.seqRef = 'SRV' + Date.now().toString().slice(-9);
  }
  if (!this.slaDueAt) {
    const hours = SLA_HOURS[this.priority] || SLA_HOURS.medium;
    const base = this.requestDate || Date.now();
    this.slaDueAt = new Date(new Date(base).getTime() + hours * 3600000);
  }
  if (this.isModified('status') && this.status === 'completed' && !this.resolvedAt) {
    this.resolvedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('ServTrans', servTransSchema);
