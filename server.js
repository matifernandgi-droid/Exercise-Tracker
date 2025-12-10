// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

// Imprimir variables para verificar carga
console.log("MONGO_URI =", process.env.MONGO_URI);
console.log("PORT =", process.env.PORT);

// Conectar a MongoDB
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("❌ ERROR: MONGO_URI no está definido en .env");
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log("❌ Error al conectar MongoDB:", err));

// MODELOS
const User = require("./models/user");
const Exercise = require("./models/exercise");

// RUTAS FCC

// Crear usuario
app.post("/api/users", async (req, res) => {
  try {
    const username = req.body.username;
    const newUser = new User({ username });
    const saved = await newUser.save();
    res.json({ username: saved.username, _id: saved._id });
  } catch (err) {
    res.status(500).json({ error: "Error al crear el usuario" });
  }
});

// Listar usuarios
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "_id username");
  res.json(users);
});

// Agregar ejercicio
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.json({ error: "Usuario no encontrado" });

    const exerciseDate = date ? new Date(date) : new Date();
    const exercise = new Exercise({
      userId,
      description,
      duration: Number(duration),
      date: exerciseDate
    });

    const saved = await exercise.save();

    res.json({
      username: user.username,
      description: saved.description,
      duration: saved.duration,
      date: saved.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: "Error al agregar ejercicio" });
  }
});

// Obtener logs
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    const user = await User.findById(userId);
    if (!user) return res.json({ error: "Usuario no encontrado" });

    let filter = { userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).select("description duration date");
    if (limit) query = query.limit(Number(limit));
    const exercises = await query.exec();

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({ username: user.username, count: log.length, _id: user._id, log });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener logs" });
  }
});

// Página principal
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));