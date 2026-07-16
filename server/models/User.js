const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8, select: false },
  phone: { type: String },
  photo: { type: String, default: '' },
  role: { type: String, default: 'user' },
  status: { type: String, enum: ['active', 'blocked', 'deleted'], default: 'active' },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationOTP: String,
  emailVerificationExpiry: Date,
  passwordResetOTP: String,
  passwordResetExpiry: Date,
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
