const mongoose = require('mongoose');

const contractPaymentSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseContract', required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['token', 'advance', 'installment', 'final'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  // sparse: only enforces uniqueness among documents that actually have a
  // transactionId (manual/offline payment records may have none), but
  // prevents the same Razorpay payment being recorded against more than
  // one contract.
  transactionId: { type: String, unique: true, sparse: true },
  notes: String,
  paidAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('ContractPayment', contractPaymentSchema);
