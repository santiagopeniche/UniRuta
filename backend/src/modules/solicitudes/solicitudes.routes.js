const router = require('express').Router();
const { requiereSesion } = require('../../middleware/auth');
const { asincrono, noEncontrado } = require('../../utils/errores');
const solicitudes = require('./solicitudes.service');

router.use(requiereSesion);

const idSolicitud = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw noEncontrado('La solicitud no existe');
  return id;
};

router.get(
  '/mias',
  asincrono(async (req, res) => {
    res.json({ solicitudes: await solicitudes.misSolicitudes(req.usuario.id) });
  })
);

router.get(
  '/recibidas',
  asincrono(async (req, res) => {
    res.json({ solicitudes: await solicitudes.recibidas(req.usuario.id) });
  })
);

// RF-06
router.post(
  '/:id/aceptar',
  asincrono(async (req, res) => {
    res.json({ solicitud: await solicitudes.aceptar(idSolicitud(req), req.usuario.id) });
  })
);

router.post(
  '/:id/rechazar',
  asincrono(async (req, res) => {
    res.json({ solicitud: await solicitudes.rechazar(idSolicitud(req), req.usuario.id) });
  })
);

router.post(
  '/:id/cancelar',
  asincrono(async (req, res) => {
    res.json({ solicitud: await solicitudes.cancelar(idSolicitud(req), req.usuario.id) });
  })
);

module.exports = router;
