const router = require('express').Router();
const { requiereSesion } = require('../../middleware/auth');
const { asincrono } = require('../../utils/errores');
const avisos = require('./avisos.service');

router.use(requiereSesion);

router.get(
  '/',
  asincrono(async (req, res) => {
    const [lista, noLeidos] = await Promise.all([avisos.listar(req.usuario.id), avisos.contarNoLeidos(req.usuario.id)]);
    res.json({ avisos: lista, noLeidos });
  })
);

router.post(
  '/leer',
  asincrono(async (req, res) => {
    await avisos.marcarLeidos(req.usuario.id);
    res.json({ ok: true });
  })
);

module.exports = router;
