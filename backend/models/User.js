const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'admin'], default: 'client' },
  activePassStart: { type: Date, default: null },
  activePassExpiry: { type: Date, default: null },
  ttlockUserId: { type: Number, default: null }, // for sending eKeys
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String }
});

module.exports = mongoose.model('User', userSchema);
