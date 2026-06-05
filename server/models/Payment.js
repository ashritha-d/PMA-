const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentType: { type: String, enum: ['booking_fee', 'security_deposit', 'rent', 'advance', 'miscellaneous'], required: true },
  paymentMode: { type: String, enum: ['upi', 'cash', 'cheque', 'online', 'card'], required: true },
  transactionId: String,
  upiId: String,
  qrCodeUrl: String,
  receiptUrl: String,
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  verifiedAt: Date,
  notes: String,
  screenshotUrl: String,
  createdAt: { type: Date, default: Date.now },
});

paymentSchema.pre('save', function (next) {
  if (!this.paymentId) {
    this.paymentId = 'PAY' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
