const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// MongoDB
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
  userId: String
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// ROUTES
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// 1. Create new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  
  try {
    const user = new User({ username });
    await user.save();
    res.json({ 
      username: user.username, 
      _id: user._id 
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// 2. Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// 3. Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  let { description, duration, date } = req.body;
  
  try {
    // Find user
    const user = await User.findById(_id);
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    // Create exercise
    const exercise = new Exercise({
      username: user.username,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
      userId: user._id
    });
    
    await exercise.save();
    
    // Response format EXACTLY as freeCodeCamp expects
    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description
    });
    
  } catch (err) {
    res.json({ error: err.message });
  }
});

// 4. Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  
  try {
    // Find user
    const user = await User.findById(_id);
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    // Build date filter
    let dateFilter = {};
    if (from) {
      dateFilter.$gte = new Date(from);
    }
    if (to) {
      dateFilter.$lte = new Date(to);
    }
    
    // Build query
    let filter = { userId: _id };
    if (from || to) {
      filter.date = dateFilter;
    }
    
    // Execute query
    let exercises = Exercise.find(filter);
    
    if (limit) {
      exercises = exercises.limit(parseInt(limit));
    }
    
    const exercisesData = await exercises.exec();
    
    // Format response
    const log = exercisesData.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    
    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    });
    
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Server
const PORT = process.env.PORT || 3000;
const listener = app.listen(PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});