const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../../config');
const { requiereSesion } = require('../../middleware/auth');
const { asincrono, noEncontrado } = require('../../utils/errores');
const usuarios = require('./usuarios.service');

// Limita intentos de registro e inicio de sesión para frenar ataques de fuerza bruta
const limiteAcceso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.esPrueba,
  message: { error: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' },
});

const auth = express.Router();

auth.post(
  '/registro',
  limiteAcceso,
  asincrono(async (req, res) => {
    const resultado = await usuarios.registrar(req.body || {});
    res.status(201).json({
      mensaje: resultado.requiereVerificacion
        ? 'Cuenta creada. Te enviamos un correo para confirmarla.'
        : 'Cuenta creada. Ya puedes iniciar sesión.',
      requiereVerificacion: resultado.requiereVerificacion,
    });
  })
);

auth.post(
  '/verificar',
  asincrono(async (req, res) => {
    res.json(await usuarios.verificarCorreo(req.body?.token));
  })
);

auth.post(
  '/reenviar-verificacion',
  limiteAcceso,
  asincrono(async (req, res) => {
    await usuarios.reenviarVerificacion(req.body?.correo);
    res.json({ mensaje: 'Si la cuenta existe y no está confirmada, te enviamos un nuevo correo.' });
  })
);

auth.post(
  '/login',
  limiteAcceso,
  asincrono(async (req, res) => {
    res.json(await usuarios.iniciarSesion(req.body || {}));
  })
);

const perfil = express.Router();
perfil.use(requiereSesion);

perfil.get(
  '/me',
  asincrono(async (req, res) => {
    res.json({ usuario: await usuarios.obtenerPerfil(req.usuario.id) });
  })
);

perfil.patch(
  '/me',
  asincrono(async (req, res) => {
    res.json({ usuario: await usuarios.actualizarPerfil(req.usuario.id, req.body || {}) });
  })
);

perfil.get(
  '/:id',
  asincrono(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw noEncontrado('Usuario no encontrado');
    res.json({ usuario: await usuarios.perfilPublico(id) });
  })
);

module.exports = { auth, perfil };
