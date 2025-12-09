const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.error("Error conectando a MongoDB:", err));

// Esquemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Crear un usuario
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  const user = new User({ username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// Obtener todos los usuarios
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// Agregar ejercicio
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;
  const user = await User.findById(userId);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const exerciseDate = date ? new Date(date) : new Date();

  const exercise = new Exercise({
    userId,
    description,
    duration: parseInt(duration),
    date: exerciseDate
  });

  await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    date: exercise.date.toDateString(),
    duration: exercise.duration,
    description: exercise.description
  });
});

// Logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let query = { userId };

  const { from, to, limit } = req.query;

  if (from || to) query.date = {};
  if (from) query.date.$gte = new Date(from);
  if (to) query.date.$lte = new Date(to);

  let exercisesQuery = Exercise.find(query, 'description duration date');
  if (limit) exercisesQuery = exercisesQuery.limit(parseInt(limit));

  const exercises = await exercisesQuery.exec();

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));

  res.json({
    _id: user._id,
    username: user.username,
    count: log.length,
    log
  });
});

// Solo un listen
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});