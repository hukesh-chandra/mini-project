const mongoose = require('mongoose');

const ProofSchema = new mongoose.Schema({
  habit: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mediaUrl: String,    // Firebase storage URL
  mediaType: String,   // image/video/file
  verifiedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  rejectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Proof', ProofSchema);
