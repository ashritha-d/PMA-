const mongoose = require('mongoose');

const contractSignatureSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseContract', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['buyer', 'owner', 'admin'], required: true },
  signatureData: { type: String, required: true }, // base64 PNG canvas data
  signerName: String,
  signedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ContractSignature', contractSignatureSchema);
