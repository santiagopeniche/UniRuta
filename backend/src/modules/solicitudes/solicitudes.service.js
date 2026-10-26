// Módulo de solicitudes: el único que decide si se puede pedir o aceptar un cupo (sección A2).
// RF-05 (pedir cupo) y RF-06 (aceptar o rechazar).
const config = require('../../config');
const { query, transaccion } = require('../../db/pool');
const { avisar } = require('../avisos/avisos.service');
const { buscarChoques, VENTANA_CHOQUE } = require('../viajes/viajes.service');
const { solicitudInvalida, prohibido, noEncontrado, conflicto } = require('../../utils/errores');
const v = require('../../utils/validacion');

const TZ = config.zonaHoraria;
const ruta = (viaje) => `${viaje.origen} → ${viaje.destino}`;

/**
 * Bloquea la fila del pasajero durante la transacción. Así, todo lo que cambia sus cupos
 * (pedir, aceptar en cualquier viaje) se hace de a uno por pasajero, y dos conductores no lo
 * pueden aceptar a la misma hora al mismo tiempo. Se bloquea SIEMPRE antes que la solicitud
 * y el viaje, en ese orden, para que dos transacciones nunca se esperen mutuamente (deadlock).
 * FOR NO KEY UPDATE no frena a quien solo inserta filas que apuntan a este usuario (avisos, etc.).
 */
async function bloquearPasajero(cliente, pasajeroId) {
  await cliente.query('SELECT id FROM usuario WHERE id = $1 FOR NO KEY UPDATE', [pasajeroId]);
}

/** RF-05: el pasajero pide un cupo. La solicitud queda pendiente y se avisa al conductor. */
async function pedirCupo(viajeId, pasajeroId, { mensaje } = {}) {
  const mensajeLimpio = v.exigirTexto(mensaje, 'mensaje', { max: 200, opcional: true });

  return transaccion(async (cliente) => {
    await bloquearPasajero(cliente, pasajeroId);
    const { rows } = await cliente.query(
      `SELECT id, conductor_id, estado, fecha_hora, cupos_disponibles, origen, destino FROM viaje WHERE id = $1`,
      [viajeId]
    );
    const viaje = rows[0];
    if (!viaje) throw noEncontrado('El viaje no existe');
    if (viaje.conductor_id === pasajeroId) throw solicitudInvalida('No puedes pedir cupo en tu propio viaje');
    if (viaje.estado !== 'activo') throw conflicto('Este viaje ya no está disponible');
    if (viaje.fecha_hora <= new Date()) throw conflicto('Este viaje ya salió');
    if (viaje.cupos_disponibles <= 0) throw conflicto('Este viaje ya no tiene cupos');

    // Puede pedir en varios viajes a la misma hora mientras estén pendientes,
    // pero no si ya tiene uno confirmado o si él mismo conduce a esa hora.
    const choques = await buscarChoques(cliente, pasajeroId, viaje.fecha_hora, viaje.id);
    if (choques.comoPasajero) {
      const c = choques.comoPasajero;
      throw conflicto(
        `Ya tienes un cupo confirmado en el viaje ${ruta(c)} (${v.horaLegible(c.fecha_hora)}). ` +
          'Cancélalo si prefieres este.'
      );
    }
    if (choques.comoConductor) {
      throw conflicto(`Tienes un viaje publicado como conductor a esa hora (${v.horaLegible(choques.comoConductor.fecha_hora)}).`);
    }

    const { rows: previas } = await cliente.query(
      `SELECT id, estado FROM solicitud WHERE viaje_id = $1 AND pasajero_id = $2`,
      [viajeId, pasajeroId]
    );
    let solicitud;
    if (previas[0]) {
      const previa = previas[0];
      if (previa.estado === 'pendiente') throw conflicto('Ya pediste cupo en este viaje; espera la respuesta del conductor');
      if (previa.estado === 'aceptada') throw conflicto('Ya tienes un cupo confirmado en este viaje');
      if (previa.estado === 'rechazada') throw conflicto('El conductor ya rechazó tu solicitud para este viaje');
      // si la había cancelado él mismo, puede volver a pedirla
      const { rows: r } = await cliente.query(
        `UPDATE solicitud SET estado = 'pendiente', mensaje = $2, creado_en = NOW(), respondido_en = NULL
          WHERE id = $1 RETURNING id, estado`,
        [previa.id, mensajeLimpio]
      );
      solicitud = r[0];
    } else {
      const { rows: r } = await cliente.query(
        `INSERT INTO solicitud (viaje_id, pasajero_id, mensaje) VALUES ($1, $2, $3) RETURNING id, estado`,
        [viajeId, pasajeroId, mensajeLimpio]
      );
      solicitud = r[0];
    }

    const { rows: p } = await cliente.query('SELECT nombre FROM usuario WHERE id = $1', [pasajeroId]);
    await avisar(
      { usuarioId: viaje.conductor_id, tipo: 'solicitud_nueva', viajeId, mensaje: `${p[0].nombre} te pidió un cupo en tu viaje ${ruta(viaje)}.` },
      cliente
    );
    return solicitud;
  });
}

/**
 * Bloquea la solicitud y su viaje y verifica que quien responde sea el conductor.
 * Con `antesDeValidarEstado` se puede revisar algo más (los choques de horario) antes de mirar
 * el estado, para dar el motivo real cuando la solicitud se canceló por un choque.
 */
async function bloquearParaResponder(cliente, solicitudId, conductorId, antesDeValidarEstado) {
  const { rows } = await cliente.query(
    `SELECT s.id, s.estado, s.pasajero_id, v.id AS viaje_id, v.conductor_id, v.estado AS viaje_estado,
            v.cupos_disponibles, v.fecha_hora, v.origen, v.destino
       FROM solicitud s JOIN viaje v ON v.id = s.viaje_id
      WHERE s.id = $1
      FOR NO KEY UPDATE OF s, v`,
    [solicitudId]
  );
  const s = rows[0];
  if (!s) throw noEncontrado('La solicitud no existe');
  if (s.conductor_id !== conductorId) throw prohibido('Solo el conductor del viaje puede responder esta solicitud');
  if (antesDeValidarEstado) await antesDeValidarEstado(s);
  if (s.estado !== 'pendiente') throw conflicto(`Esta solicitud ya fue ${s.estado}`);
  if (s.viaje_estado !== 'activo') throw conflicto('El viaje ya no está activo');
  return s;
}

/**
 * RF-06: aceptar. La verificación de cupos y la resta se hacen en la misma transacción
 * con el viaje bloqueado, para que dos aceptaciones simultáneas no sobrevendan el último cupo
 * (riesgo identificado en la sección 9.10). Además se verifica que el pasajero no tenga ya
 * un cupo confirmado a esa hora en otro viaje, y al aceptarlo se cancelan sus demás
 * solicitudes pendientes en esa franja.
 */
async function aceptar(solicitudId, conductorId) {
  return transaccion(async (cliente) => {
    // 1) Primero el pasajero (ver bloquearPasajero), luego la solicitud y el viaje
    const { rows: dueno } = await cliente.query('SELECT pasajero_id FROM solicitud WHERE id = $1', [solicitudId]);
    if (!dueno[0]) throw noEncontrado('La solicitud no existe');
    await bloquearPasajero(cliente, dueno[0].pasajero_id);

    const s = await bloquearParaResponder(cliente, solicitudId, conductorId, async (sol) => {
      const choques = await buscarChoques(cliente, sol.pasajero_id, sol.fecha_hora, sol.viaje_id);
      // No se le dice al conductor en qué otro viaje va el pasajero (privacidad)
      if (choques.comoPasajero || choques.comoConductor) {
        throw conflicto('Este pasajero ya tiene un cupo confirmado en otro viaje a esa misma hora.');
      }
    });
    if (s.cupos_disponibles <= 0) throw conflicto('El viaje ya no tiene cupos disponibles');

    const { rows: v2 } = await cliente.query(
      `UPDATE viaje SET cupos_disponibles = cupos_disponibles - 1 WHERE id = $1 RETURNING cupos_disponibles`,
      [s.viaje_id]
    );
    await cliente.query(`UPDATE solicitud SET estado = 'aceptada', respondido_en = NOW() WHERE id = $1`, [solicitudId]);

    // 2) Ya tiene viaje a esa hora: sus otras solicitudes pendientes en la franja se cancelan
    //    y se avisa a esos conductores para que no le guarden el puesto.
    const { rows: liberadas } = await cliente.query(
      `UPDATE solicitud s SET estado = 'cancelada', respondido_en = NOW()
         FROM viaje v
        WHERE v.id = s.viaje_id AND s.pasajero_id = $1 AND s.estado = 'pendiente' AND s.viaje_id <> $2
          AND v.estado = 'activo'
          AND v.fecha_hora BETWEEN $3::timestamptz - INTERVAL '${VENTANA_CHOQUE}' AND $3::timestamptz + INTERVAL '${VENTANA_CHOQUE}'
        RETURNING v.id AS viaje_id, v.conductor_id, v.origen, v.destino`,
      [s.pasajero_id, s.viaje_id, s.fecha_hora]
    );
    if (liberadas.length) {
      const { rows: p } = await cliente.query('SELECT nombre FROM usuario WHERE id = $1', [s.pasajero_id]);
      for (const l of liberadas) {
        await avisar(
          {
            usuarioId: l.conductor_id,
            tipo: 'solicitud_cancelada',
            viajeId: l.viaje_id,
            mensaje: `${p[0].nombre} consiguió cupo en otro viaje a la misma hora, así que su solicitud en tu viaje ${ruta(l)} se canceló.`,
          },
          cliente
        );
      }
    }

    await avisar(
      {
        usuarioId: s.pasajero_id,
        tipo: 'solicitud_aceptada',
        viajeId: s.viaje_id,
        mensaje:
          `¡Tienes cupo! El conductor aceptó tu solicitud para el viaje ${ruta(s)}.` +
          (liberadas.length
            ? ` Cancelamos ${liberadas.length === 1 ? 'tu otra solicitud' : `tus otras ${liberadas.length} solicitudes`} a esa hora.`
            : ''),
      },
      cliente
    );

    // Si se llenó el viaje, las demás solicitudes pendientes se rechazan y se avisa
    const cuposRestantes = v2[0].cupos_disponibles;
    if (cuposRestantes === 0) {
      const { rows: otras } = await cliente.query(
        `UPDATE solicitud SET estado = 'rechazada', respondido_en = NOW()
          WHERE viaje_id = $1 AND estado = 'pendiente' RETURNING pasajero_id`,
        [s.viaje_id]
      );
      for (const o of otras) {
        await avisar(
          { usuarioId: o.pasajero_id, tipo: 'viaje_lleno', viajeId: s.viaje_id, mensaje: `El viaje ${ruta(s)} se llenó y tu solicitud no pudo ser aceptada.` },
          cliente
        );
      }
    }
    return { id: solicitudId, estado: 'aceptada', cuposDisponibles: cuposRestantes, otrasCanceladas: liberadas.length };
  });
}

/** RF-06: rechazar. El cupo no cambia y se avisa al pasajero. */
async function rechazar(solicitudId, conductorId) {
  return transaccion(async (cliente) => {
    const s = await bloquearParaResponder(cliente, solicitudId, conductorId);
    await cliente.query(`UPDATE solicitud SET estado = 'rechazada', respondido_en = NOW() WHERE id = $1`, [solicitudId]);
    await avisar(
      { usuarioId: s.pasajero_id, tipo: 'solicitud_rechazada', viajeId: s.viaje_id, mensaje: `El conductor no pudo aceptar tu solicitud para el viaje ${ruta(s)}.` },
      cliente
    );
    return { id: solicitudId, estado: 'rechazada', cuposDisponibles: s.cupos_disponibles };
  });
}

/** El pasajero cancela su solicitud. Si ya estaba aceptada, el cupo vuelve al viaje. */
async function cancelar(solicitudId, pasajeroId) {
  return transaccion(async (cliente) => {
    const { rows } = await cliente.query(
      `SELECT s.id, s.estado, s.pasajero_id, v.id AS viaje_id, v.conductor_id, v.estado AS viaje_estado,
              v.fecha_hora, v.origen, v.destino
         FROM solicitud s JOIN viaje v ON v.id = s.viaje_id
        WHERE s.id = $1 FOR UPDATE OF s, v`,
      [solicitudId]
    );
    const s = rows[0];
    if (!s) throw noEncontrado('La solicitud no existe');
    if (s.pasajero_id !== pasajeroId) throw prohibido('Solo puedes cancelar tus propias solicitudes');
    if (!['pendiente', 'aceptada'].includes(s.estado)) throw conflicto(`Esta solicitud ya está ${s.estado}`);
    if (s.viaje_estado !== 'activo') throw conflicto('El viaje ya no está activo');

    if (s.estado === 'aceptada') {
      await cliente.query(`UPDATE viaje SET cupos_disponibles = cupos_disponibles + 1 WHERE id = $1`, [s.viaje_id]);
    }
    await cliente.query(`UPDATE solicitud SET estado = 'cancelada', respondido_en = NOW() WHERE id = $1`, [solicitudId]);
    const { rows: p } = await cliente.query('SELECT nombre FROM usuario WHERE id = $1', [pasajeroId]);
    await avisar(
      {
        usuarioId: s.conductor_id,
        tipo: 'solicitud_cancelada',
        viajeId: s.viaje_id,
        mensaje: `${p[0].nombre} canceló ${s.estado === 'aceptada' ? 'su cupo' : 'su solicitud'} en tu viaje ${ruta(s)}.`,
      },
      cliente
    );
    return { id: solicitudId, estado: 'cancelada' };
  });
}

/** Solicitudes hechas por el pasajero, con los datos del viaje. */
async function misSolicitudes(pasajeroId) {
  const { rows } = await query(
    `SELECT s.id, s.estado, s.mensaje, s.creado_en AS "creadoEn",
            json_build_object(
              'id', v.id, 'origen', v.origen, 'destino', v.destino, 'puntoEncuentro', v.punto_encuentro,
              'fecha', to_char(v.fecha_hora AT TIME ZONE '${TZ}', 'YYYY-MM-DD'),
              'hora', to_char(v.fecha_hora AT TIME ZONE '${TZ}', 'HH24:MI'),
              'estado', v.estado, 'aporteSugerido', v.aporte_sugerido,
              'conductorNombre', u.nombre
            ) AS viaje
       FROM solicitud s
       JOIN viaje v ON v.id = s.viaje_id
       JOIN usuario u ON u.id = v.conductor_id
      WHERE s.pasajero_id = $1
      ORDER BY (v.estado = 'activo' AND v.fecha_hora > NOW()) DESC, v.fecha_hora ASC
      LIMIT 100`,
    [pasajeroId]
  );
  return rows;
}

/** Solicitudes pendientes en los viajes del conductor (pantalla "Solicitudes recibidas"). */
async function recibidas(conductorId) {
  const { rows } = await query(
    `SELECT s.id, s.estado, s.mensaje, s.creado_en AS "creadoEn",
            json_build_object('id', p.id, 'nombre', p.nombre, 'promedio', rep.promedio, 'totalCalificaciones', rep.total) AS pasajero,
            json_build_object(
              'id', v.id, 'origen', v.origen, 'destino', v.destino,
              'fecha', to_char(v.fecha_hora AT TIME ZONE '${TZ}', 'YYYY-MM-DD'),
              'hora', to_char(v.fecha_hora AT TIME ZONE '${TZ}', 'HH24:MI'),
              'cuposDisponibles', v.cupos_disponibles
            ) AS viaje
       FROM solicitud s
       JOIN viaje v ON v.id = s.viaje_id
       JOIN usuario p ON p.id = s.pasajero_id
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(puntaje)::numeric, 1)::float AS promedio, COUNT(*)::int AS total
           FROM calificacion WHERE calificado_id = p.id
       ) rep ON TRUE
      WHERE v.conductor_id = $1 AND s.estado = 'pendiente' AND v.estado = 'activo' AND v.fecha_hora > NOW()
      ORDER BY v.fecha_hora ASC, s.creado_en ASC`,
    [conductorId]
  );
  return rows;
}

module.exports = { pedirCupo, aceptar, rechazar, cancelar, misSolicitudes, recibidas };
