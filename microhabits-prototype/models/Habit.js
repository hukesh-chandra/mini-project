const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  title: String,
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  streak: { type: Number, default: 0 }
});

module.exports = mongoose.model('Habit', HabitSchema);
