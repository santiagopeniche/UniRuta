// Aplicación Express (sin .listen, para poder probarla con supertest)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { query } = require('./db/pool');
const usuarios = require('./modules/usuarios/usuarios.routes');
const viajes = require('./modules/viajes/viajes.routes');
const solicitudes = require('./modules/solicitudes/solicitudes.routes');
const avisos = require('./modules/avisos/avisos.routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middleware/errores');

const app = express();

app.set('trust proxy', 1); // Render y Vercel ponen un proxy delante del servidor
app.use(helmet());
app.use(
  cors({
    origin: config.esProduccion ? config.frontendUrl : true,
  })
);
app.use(express.json({ limit: '20kb' }));

app.get('/api/salud', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ estado: 'ok', baseDeDatos: 'ok' });
  } catch {
    res.status(503).json({ estado: 'error', baseDeDatos: 'sin conexión' });
  }
});

app.use('/api/auth', usuarios.auth);
app.use('/api/usuarios', usuarios.perfil);
app.use('/api/viajes', viajes);
app.use('/api/solicitudes', solicitudes);
app.use('/api/avisos', avisos);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
