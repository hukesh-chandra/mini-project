const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  displayName: String,
  email: String,
  avatar: String,
  joinedHabits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habit' }]
});

module.exports = mongoose.model('User', UserSchema);
