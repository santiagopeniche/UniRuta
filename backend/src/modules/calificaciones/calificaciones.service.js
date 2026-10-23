// Módulo de calificaciones: RF-07, calificación mutua al terminar el viaje.
const { query } = require('../../db/pool');
const viajes = require('../viajes/viajes.service');
const { avisar } = require('../avisos/avisos.service');
const { solicitudInvalida, prohibido, noEncontrado, conflicto } = require('../../utils/errores');
const v = require('../../utils/validacion');

/**
 * Personas a las que `usuarioId` puede calificar en el viaje:
 * el pasajero califica al conductor; el conductor califica a cada pasajero aceptado.
 */
async function calificables(viajeId, usuarioId) {
  const gente = await viajes.participantes(viajeId);
  const yo = gente.find((p) => p.id === usuarioId);
  if (!yo) return { esParticipante: false, personas: [] };

  const candidatos = yo.papel === 'conductor' ? gente.filter((p) => p.papel === 'pasajero') : gente.filter((p) => p.papel === 'conductor');
  const { rows: hechas } = await query(`SELECT calificado_id FROM calificacion WHERE viaje_id = $1 AND autor_id = $2`, [
    viajeId,
    usuarioId,
  ]);
  const yaCalificados = new Set(hechas.map((h) => h.calificado_id));
  return {
    esParticipante: true,
    personas: candidatos.map((p) => ({ id: p.id, nombre: p.nombre, papel: p.papel, yaCalificado: yaCalificados.has(p.id) })),
  };
}

async function pendientes(viajeId, usuarioId) {
  const viaje = await viajes.obtenerViaje(viajeId);
  if (!viaje) throw noEncontrado('El viaje no existe');
  const { esParticipante, personas } = await calificables(viajeId, usuarioId);
  if (!esParticipante) throw prohibido('No participaste en este viaje');
  return { viaje, habilitado: await viajes.viajeCalificable(viaje), personas };
}

async function calificar(viajeId, autorId, { calificadoId, puntaje, comentario }) {
  const idCalificado = v.exigirEntero(calificadoId, 'calificadoId', { min: 1 });
  const nota = v.exigirEntero(puntaje, 'puntaje', { min: 1, max: 5 });
  const comentarioLimpio = v.exigirTexto(comentario, 'comentario', { max: 300, opcional: true });

  const viaje = await viajes.obtenerViaje(viajeId);
  if (!viaje) throw noEncontrado('El viaje no existe');
  if (!(await viajes.viajeCalificable(viaje))) {
    throw conflicto('Solo puedes calificar cuando el viaje haya terminado');
  }

  const { esParticipante, personas } = await calificables(viajeId, autorId);
  if (!esParticipante) throw prohibido('Solo los participantes del viaje pueden calificar');
  const objetivo = personas.find((p) => p.id === idCalificado);
  if (!objetivo) throw solicitudInvalida('Solo puedes calificar a tus compañeros de este viaje');
  if (objetivo.yaCalificado) throw conflicto('Ya calificaste a esta persona en este viaje');

  try {
    const { rows } = await query(
      `INSERT INTO calificacion (viaje_id, autor_id, calificado_id, puntaje, comentario)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, puntaje, comentario`,
      [viajeId, autorId, idCalificado, nota, comentarioLimpio]
    );
    await avisar({
      usuarioId: idCalificado,
      tipo: 'calificacion_recibida',
      viajeId,
      mensaje: `Recibiste una calificación de ${nota} ★ por el viaje ${viaje.origen} → ${viaje.destino}.`,
    });
    return rows[0];
  } catch (error) {
    // dos envíos al mismo tiempo: la restricción UNIQUE de la base de datos tiene la última palabra
    if (error.code === '23505') throw conflicto('Ya calificaste a esta persona en este viaje');
    throw error;
  }
}

module.exports = { calificables, pendientes, calificar };
