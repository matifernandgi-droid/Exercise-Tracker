const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// 🔹 Ruta raíz para FCC
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔹 MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB conectado'))
.catch(err => console.error('Error conectando a MongoDB:', err));

// 🔹 Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// 🔹 Crear un usuario
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const user = new User({ username });
  await user.save();

  res.json({ username: user.username, _id: user._id });
});

// 🔹 Obtener todos los usuarios
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// 🔹 Agregar ejercicio
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const exerciseDate = date ? new Date(date) : new Date();

  const exercise = new Exercise({
    userId,
    description,
    duration: Number(duration),
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

// 🔹 Obtener log de ejercicios
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { from, to, limit } = req.query;
  let query = { userId };

  if (from || to) query.date = {};
  if (from) query.date.$gte = new Date(from);
  if (to) query.date.$lte = new Date(to);

  let exercisesQuery = Exercise.find(query, 'description duration date').sort({ date: 'asc' });
  if (limit) exercisesQuery = exercisesQuery.limit(Number(limit));

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

// 🔹 Puerto
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});