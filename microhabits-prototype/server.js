require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const multer = require('multer');
const admin = require('firebase-admin');
const fs = require('fs');
const cors = require('cors');

const User = require('./models/User');
const Habit = require('./models/Habit');
const Proof = require('./models/Proof');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('MongoDB connected'))
  .catch((err)=> console.error(err));

// Firebase admin init
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET
});
const bucket = admin.storage().bucket();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// Passport config
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails && profile.emails[0] && profile.emails[0].value,
        avatar: profile.photos && profile.photos[0] && profile.photos[0].value
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id).then(u => done(null, u)).catch(done));

app.use(passport.initialize());
app.use(passport.session());

// Multer setup (save to /uploads temporarily)
const upload = multer({ dest: 'uploads/' });

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io basic auth mapping
const onlineUsers = {}; // socketId -> userId
io.on('connection', socket => {
  console.log('Socket connected:', socket.id);
  socket.on('register', (userId) => {
    onlineUsers[userId] = socket.id;
  });
  socket.on('disconnect', () => {
    // cleanup
    for (let uid in onlineUsers) {
      if (onlineUsers[uid] === socket.id) delete onlineUsers[uid];
    }
  });
});

// Routes

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/'));

// simple logout
app.get('/auth/logout', (req, res) => {
  req.logout(() => {});
  res.redirect('/');
});

// API: get current user
app.get('/api/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user });
});

// API: create habit
app.post('/api/habits', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { title, description } = req.body;
  const habit = await Habit.create({ title, description, creator: req.user._id, members: [req.user._id] });
  req.user.joinedHabits.push(habit._id);
  await req.user.save();
  res.json({ habit });
});

// API: list habits
app.get('/api/habits', async (req, res) => {
  const habits = await Habit.find().populate('creator', 'displayName avatar');
  res.json({ habits });
});

// API: join habit
app.post('/api/habits/:id/join', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const habit = await Habit.findById(req.params.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  if (!habit.members.includes(req.user._id)) {
    habit.members.push(req.user._id);
    await habit.save();
  }
  if (!req.user.joinedHabits.includes(habit._id)) {
    req.user.joinedHabits.push(habit._id);
    await req.user.save();
  }
  res.json({ habit });
});

// API: upload proof (Multer) then upload to Firebase and create Proof doc
app.post('/api/habits/:id/proof', upload.single('media'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const habit = await Habit.findById(req.params.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Upload local file to Firebase Storage
    const localPath = req.file.path;
    const destName = `proofs/${Date.now()}_${req.file.originalname}`;
    await bucket.upload(localPath, {
      destination: destName,
      metadata: { contentType: req.file.mimetype }
    });
    // Make public URL
    const file = bucket.file(destName);
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_BUCKET}/${destName}`;

    // create proof doc
    const proof = await Proof.create({
      habit: habit._id,
      user: req.user._id,
      mediaUrl: publicUrl,
      mediaType: req.file.mimetype.startsWith('image') ? 'image' : (req.file.mimetype.startsWith('video') ? 'video' : 'file'),
      verifiedBy: [],
      rejectedBy: []
    });

    // remove local temp
    fs.unlinkSync(localPath);

    // Notify habit members via socket.io
    habit.members.forEach(memberId => {
      const sid = onlineUsers[memberId];
      if (sid) {
        io.to(sid).emit('new-proof', { habitId: habit._id, proof });
      }
    });

    res.json({ proof });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// API: get proofs for a habit
app.get('/api/habits/:id/proofs', async (req, res) => {
  const proofs = await Proof.find({ habit: req.params.id }).populate('user', 'displayName avatar');
  res.json({ proofs });
});

// API: verify proof (peer validation)
app.post('/api/proofs/:id/verify', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { action } = req.body; // 'verify' or 'reject'
  const proof = await Proof.findById(req.params.id);
  if (!proof) return res.status(404).json({ error: 'Proof not found' });

  if (action === 'verify') {
    if (!proof.verifiedBy.includes(req.user._id)) proof.verifiedBy.push(req.user._id);
  } else {
    if (!proof.rejectedBy.includes(req.user._id)) proof.rejectedBy.push(req.user._id);
  }
  await proof.save();

  // notify owner
  const sid = onlineUsers[proof.user.toString()];
  if (sid) {
    io.to(sid).emit('proof-verified', { proofId: proof._id, action, by: req.user._id });
  }

  res.json({ proof });
});

// Fallback to index
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
