// Módulo de avisos: notificaciones dentro de la app (y opcionalmente por correo).
const { query } = require('../../db/pool');
const config = require('../../config');
const { enviarCorreo } = require('../correo/correo.service');

/**
 * Crea un aviso para un usuario. Acepta un cliente de transacción para que el aviso
 * quede guardado junto con la operación que lo originó (o no se guarde ninguno de los dos).
 */
async function avisar({ usuarioId, tipo, mensaje, viajeId = null }, cliente = null) {
  const ejecutor = cliente || { query };
  const { rows } = await ejecutor.query(
    `INSERT INTO aviso (usuario_id, tipo, mensaje, viaje_id) VALUES ($1, $2, $3, $4) RETURNING id`,
    [usuarioId, tipo, mensaje, viajeId]
  );

  if (config.correo.enviarAvisos) {
    const { rows: u } = await ejecutor.query('SELECT correo FROM usuario WHERE id = $1', [usuarioId]);
    if (u[0]) {
      // no se espera el envío para no demorar la respuesta
      enviarCorreo({
        para: u[0].correo,
        asunto: 'Uniruta UTB — tienes un aviso nuevo',
        texto: `${mensaje}\n\nEntra a ${config.frontendUrl}/avisos para ver el detalle.`,
      });
    }
  }
  return rows[0].id;
}

async function listar(usuarioId) {
  const { rows } = await query(
    `SELECT id, tipo, mensaje, viaje_id AS "viajeId", leido, creado_en AS "creadoEn"
       FROM aviso WHERE usuario_id = $1 ORDER BY creado_en DESC, id DESC LIMIT 50`,
    [usuarioId]
  );
  return rows;
}

async function contarNoLeidos(usuarioId) {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM aviso WHERE usuario_id = $1 AND NOT leido', [
    usuarioId,
  ]);
  return rows[0].total;
}

async function marcarLeidos(usuarioId) {
  await query('UPDATE aviso SET leido = TRUE WHERE usuario_id = $1 AND NOT leido', [usuarioId]);
}

module.exports = { avisar, listar, contarNoLeidos, marcarLeidos };
