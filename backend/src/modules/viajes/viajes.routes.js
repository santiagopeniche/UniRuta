const router = require('express').Router();
const { requiereSesion, requiereConductor } = require('../../middleware/auth');
const { asincrono, noEncontrado } = require('../../utils/errores');
const viajes = require('./viajes.service');
const solicitudes = require('../solicitudes/solicitudes.service');
const calificaciones = require('../calificaciones/calificaciones.service');

router.use(requiereSesion);

/** Convierte :id en número o responde 404. */
function idViaje(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw noEncontrado('El viaje no existe');
  return id;
}

// RF-04: GET /api/viajes?origen=&destino=&fecha=AAAA-MM-DD&horaDesde=HH:MM&horaHasta=HH:MM
router.get(
  '/',
  asincrono(async (req, res) => {
    res.json({ viajes: await viajes.buscar(req.usuario.id, req.query) });
  })
);

// RF-03
router.post(
  '/',
  requiereConductor,
  asincrono(async (req, res) => {
    res.status(201).json({ viaje: await viajes.publicar(req.usuario.id, req.body || {}) });
  })
);

router.get(
  '/mios',
  asincrono(async (req, res) => {
    res.json({ viajes: await viajes.misViajes(req.usuario.id) });
  })
);

router.get(
  '/historial',
  asincrono(async (req, res) => {
    res.json({ viajes: await viajes.historial(req.usuario.id) });
  })
);

router.get(
  '/:id',
  asincrono(async (req, res) => {
    res.json({ viaje: await viajes.detalle(idViaje(req), req.usuario.id) });
  })
);

router.post(
  '/:id/finalizar',
  asincrono(async (req, res) => {
    res.json({ viaje: await viajes.finalizar(idViaje(req), req.usuario.id) });
  })
);

router.post(
  '/:id/cancelar',
  asincrono(async (req, res) => {
    res.json({ viaje: await viajes.cancelar(idViaje(req), req.usuario.id) });
  })
);

// RF-05: pedir cupo
router.post(
  '/:id/solicitudes',
  asincrono(async (req, res) => {
    res.status(201).json({ solicitud: await solicitudes.pedirCupo(idViaje(req), req.usuario.id, req.body || {}) });
  })
);

// RF-07: calificaciones
router.get(
  '/:id/calificaciones',
  asincrono(async (req, res) => {
    res.json(await calificaciones.pendientes(idViaje(req), req.usuario.id));
  })
);

router.post(
  '/:id/calificaciones',
  asincrono(async (req, res) => {
    res.status(201).json({ calificacion: await calificaciones.calificar(idViaje(req), req.usuario.id, req.body || {}) });
  })
);

module.exports = router;
