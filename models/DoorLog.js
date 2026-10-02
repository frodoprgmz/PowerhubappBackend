const mongoose = require('mongoose');

const doorLogSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, required: true }, // 'Sukces' or 'Błąd'
  timestamp: { type: Date, default: Date.now },
  details: { type: String }
});

// Add TTL index: Delete logs older than 90 days automatically to save MongoDB space (Atlas Free Tier limit is 512MB)
doorLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('DoorLog', doorLogSchema);
