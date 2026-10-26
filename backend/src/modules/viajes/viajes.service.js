// Módulo de viajes: publicación (RF-03), búsqueda (RF-04), detalle, finalización e historial.
const config = require('../../config');
const { query, transaccion } = require('../../db/pool');
const { avisar } = require('../avisos/avisos.service');
const { solicitudInvalida, prohibido, noEncontrado, conflicto } = require('../../utils/errores');
const v = require('../../utils/validacion');

const TZ = config.zonaHoraria;
const MINUTOS_ANTES_PARA_FINALIZAR = 30;
// Dos viajes a menos de esta distancia se consideran a la misma hora
const VENTANA_CHOQUE = '1 hour';
const HORAS_PARA_CALIFICAR_SIN_FINALIZAR = 2;

// Columnas comunes de un viaje, con fecha y hora ya en hora de Colombia para la interfaz
const COLUMNAS_VIAJE = `
  v.id, v.origen, v.destino, v.punto_encuentro AS "puntoEncuentro",
  v.fecha_hora AS "fechaHora",
  to_char(v.fecha_hora AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS "fecha",
  to_char(v.fecha_hora AT TIME ZONE '${TZ}', 'HH24:MI') AS "hora",
  v.cupos_totales AS "cuposTotales", v.cupos_disponibles AS "cuposDisponibles",
  v.aporte_sugerido AS "aporteSugerido", v.notas, v.estado, v.conductor_id AS "conductorId"`;

// Reputación del conductor, calculada a partir de sus calificaciones
const REPUTACION_CONDUCTOR = `
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(puntaje)::numeric, 1)::float AS promedio, COUNT(*)::int AS total
      FROM calificacion WHERE calificado_id = v.conductor_id
  ) rep ON TRUE`;

/** Valida los datos del formulario de publicación. Exportada para pruebas unitarias. */
function validarDatosViaje(datos, ahora = new Date()) {
  const origen = v.exigirTexto(datos.origen, 'origen', { min: 3, max: 120 });
  const destino = v.exigirTexto(datos.destino, 'destino', { min: 3, max: 120 });
  if (v.normalizarBusqueda(origen) === v.normalizarBusqueda(destino)) {
    throw solicitudInvalida('El origen y el destino no pueden ser iguales');
  }
  const puntoEncuentro = v.exigirTexto(datos.puntoEncuentro, 'punto de encuentro', { min: 3, max: 160 });
  const fechaHora = v.fechaHoraColombia(datos.fecha, datos.hora);
  if (fechaHora.getTime() <= ahora.getTime()) throw solicitudInvalida('La fecha y hora del viaje deben ser futuras');
  const limite = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (fechaHora > limite) throw solicitudInvalida('Solo puedes publicar viajes para los próximos 30 días');
  const cupos = v.exigirEntero(datos.cupos, 'cupos', { min: 1, max: 6 });
  const aporteSugerido = v.exigirEntero(datos.aporteSugerido, 'aporte sugerido', { min: 0, max: 100000, opcional: true });
  const notas = v.exigirTexto(datos.notas, 'notas', { max: 300, opcional: true });
  return { origen, destino, puntoEncuentro, fechaHora, cupos, aporteSugerido, notas };
}

/**
 * Choques de horario de un usuario alrededor de `fechaHora` (±1 hora, la misma ventana para todo):
 * - comoPasajero: un viaje activo donde ya tiene un cupo confirmado
 * - comoConductor: un viaje activo que él mismo publicó
 * Nadie puede estar en dos carros a la vez, así que cualquiera de los dos impide tomar otro viaje.
 */
async function buscarChoques(ejecutor, usuarioId, fechaHora, excluirViajeId = null) {
  const ventana = `BETWEEN $2::timestamptz - INTERVAL '${VENTANA_CHOQUE}' AND $2::timestamptz + INTERVAL '${VENTANA_CHOQUE}'`;
  const [pasajero, conductor] = await Promise.all([
    ejecutor.query(
      `SELECT v.id, v.origen, v.destino, v.fecha_hora FROM solicitud s JOIN viaje v ON v.id = s.viaje_id
        WHERE s.pasajero_id = $1 AND s.estado = 'aceptada' AND v.estado = 'activo'
          AND v.id IS DISTINCT FROM $3 AND v.fecha_hora ${ventana}
        ORDER BY v.fecha_hora LIMIT 1`,
      [usuarioId, fechaHora, excluirViajeId]
    ),
    ejecutor.query(
      `SELECT id, origen, destino, fecha_hora FROM viaje
        WHERE conductor_id = $1 AND estado = 'activo' AND id IS DISTINCT FROM $3 AND fecha_hora ${ventana}
        ORDER BY fecha_hora LIMIT 1`,
      [usuarioId, fechaHora, excluirViajeId]
    ),
  ]);
  return { comoPasajero: pasajero.rows[0] || null, comoConductor: conductor.rows[0] || null };
}

/** RF-03: el conductor publica un viaje. */
async function publicar(conductorId, datos) {
  const d = validarDatosViaje(datos);

  // Evita que el conductor publique dos viajes seguidos o publique mientras tiene un cupo como pasajero
  const choques = await buscarChoques({ query }, conductorId, d.fechaHora);
  if (choques.comoConductor) throw conflicto('Ya tienes un viaje publicado cerca de esa hora');
  if (choques.comoPasajero) {
    throw conflicto(
      `Tienes un cupo confirmado como pasajero a esa hora (${v.horaLegible(choques.comoPasajero.fecha_hora)}). ` +
        'Cancélalo antes de publicar un viaje a esa hora.'
    );
  }

  const { rows } = await query(
    `INSERT INTO viaje (conductor_id, origen, destino, punto_encuentro, fecha_hora, cupos_totales, cupos_disponibles, aporte_sugerido, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8) RETURNING id`,
    [conductorId, d.origen, d.destino, d.puntoEncuentro, d.fechaHora, d.cupos, d.aporteSugerido, d.notas]
  );
  return obtenerViaje(rows[0].id);
}

async function obtenerViaje(id) {
  const { rows } = await query(`SELECT ${COLUMNAS_VIAJE} FROM viaje v WHERE v.id = $1`, [id]);
  return rows[0];
}

const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);
// translate() quita tildes en SQL sin depender de la extensión unaccent
// (se traducen mayúsculas y minúsculas para no depender de la configuración regional del servidor)
const SIN_TILDES = (columna) => `lower(translate(${columna}, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))`;

/**
 * RF-04: búsqueda por ruta y franja horaria.
 * Solo devuelve viajes activos, futuros, con cupos y que no sean del propio usuario.
 */
async function buscar(usuarioId, filtros = {}) {
  const condiciones = [`v.estado = 'activo'`, `v.fecha_hora > NOW()`, `v.cupos_disponibles > 0`, `v.conductor_id <> $1`];
  const parametros = [usuarioId];
  const agregar = (sql, valor) => {
    parametros.push(valor);
    condiciones.push(sql.replace('?', `$${parametros.length}`));
  };

  const origen = v.normalizarBusqueda(filtros.origen);
  const destino = v.normalizarBusqueda(filtros.destino);
  if (origen) agregar(`${SIN_TILDES('v.origen')} LIKE '%' || ? || '%'`, escaparLike(origen));
  if (destino) agregar(`${SIN_TILDES('v.destino')} LIKE '%' || ? || '%'`, escaparLike(destino));

  if (filtros.fecha) {
    if (!v.esFecha(filtros.fecha)) throw solicitudInvalida('La fecha debe tener el formato AAAA-MM-DD');
    agregar(`(v.fecha_hora AT TIME ZONE '${TZ}')::date = ?::date`, filtros.fecha);
  }
  if (filtros.horaDesde) {
    if (!v.esHora(filtros.horaDesde)) throw solicitudInvalida('La hora debe tener el formato HH:MM');
    agregar(`(v.fecha_hora AT TIME ZONE '${TZ}')::time >= ?::time`, filtros.horaDesde);
  }
  if (filtros.horaHasta) {
    if (!v.esHora(filtros.horaHasta)) throw solicitudInvalida('La hora debe tener el formato HH:MM');
    agregar(`(v.fecha_hora AT TIME ZONE '${TZ}')::time <= ?::time`, filtros.horaHasta);
  }

  const { rows } = await query(
    `SELECT ${COLUMNAS_VIAJE},
            json_build_object('id', u.id, 'nombre', u.nombre, 'vehiculo', u.vehiculo,
                              'promedio', rep.promedio, 'totalCalificaciones', rep.total) AS conductor,
            s.estado AS "miSolicitud"
       FROM viaje v
       JOIN usuario u ON u.id = v.conductor_id
       ${REPUTACION_CONDUCTOR}
       LEFT JOIN solicitud s ON s.viaje_id = v.id AND s.pasajero_id = $1
      WHERE ${condiciones.join(' AND ')}
      ORDER BY v.fecha_hora ASC
      LIMIT 50`,
    parametros
  );
  return rows;
}

/** Participantes confirmados de un viaje: el conductor y los pasajeros aceptados. */
async function participantes(viajeId, ejecutor = { query }) {
  const { rows } = await ejecutor.query(
    `SELECT u.id, u.nombre, u.telefono, 'conductor' AS papel
       FROM viaje v JOIN usuario u ON u.id = v.conductor_id WHERE v.id = $1
     UNION ALL
     SELECT u.id, u.nombre, u.telefono, 'pasajero' AS papel
       FROM solicitud s JOIN usuario u ON u.id = s.pasajero_id
      WHERE s.viaje_id = $1 AND s.estado = 'aceptada'`,
    [viajeId]
  );
  return rows;
}

/** Detalle de un viaje. Lo que se muestra depende de quién lo mira. */
async function detalle(viajeId, usuarioId) {
  const { rows } = await query(
    `SELECT ${COLUMNAS_VIAJE},
            json_build_object('id', u.id, 'nombre', u.nombre, 'vehiculo', u.vehiculo, 'placa', u.placa,
                              'telefono', u.telefono, 'promedio', rep.promedio, 'totalCalificaciones', rep.total) AS conductor
       FROM viaje v JOIN usuario u ON u.id = v.conductor_id
       ${REPUTACION_CONDUCTOR}
      WHERE v.id = $1`,
    [viajeId]
  );
  const viaje = rows[0];
  if (!viaje) throw noEncontrado('El viaje no existe');

  const esConductor = viaje.conductorId === usuarioId;
  const { rows: mias } = await query(
    `SELECT id, estado, mensaje FROM solicitud WHERE viaje_id = $1 AND pasajero_id = $2`,
    [viajeId, usuarioId]
  );
  const miSolicitud = mias[0] || null;
  const confirmado = esConductor || miSolicitud?.estado === 'aceptada';

  // Teléfono y placa del conductor solo para pasajeros aceptados (privacidad)
  if (!confirmado) {
    delete viaje.conductor.telefono;
    delete viaje.conductor.placa;
  }

  const resultado = { ...viaje, esConductor, miSolicitud };

  if (confirmado) {
    const todos = await participantes(viajeId);
    resultado.pasajeros = todos.filter((p) => p.papel === 'pasajero').map(({ papel, ...p }) => p);
  }

  if (esConductor) {
    const { rows: solicitudes } = await query(
      `SELECT s.id, s.estado, s.mensaje, s.creado_en AS "creadoEn",
              json_build_object('id', p.id, 'nombre', p.nombre,
                                'telefono', CASE WHEN s.estado = 'aceptada' THEN p.telefono END,
                                'promedio', rep.promedio, 'totalCalificaciones', rep.total) AS pasajero
         FROM solicitud s JOIN usuario p ON p.id = s.pasajero_id
         LEFT JOIN LATERAL (
           SELECT ROUND(AVG(puntaje)::numeric, 1)::float AS promedio, COUNT(*)::int AS total
             FROM calificacion WHERE calificado_id = p.id
         ) rep ON TRUE
        WHERE s.viaje_id = $1
        ORDER BY (s.estado = 'pendiente') DESC, s.creado_en ASC`,
      [viajeId]
    );
    resultado.solicitudes = solicitudes;
  }

  resultado.puedeCalificar = confirmado && (await viajeCalificable(viaje));
  return resultado;
}

/** Un viaje se puede calificar si fue finalizado o si ya pasaron 2 horas desde la salida (y no se canceló). */
async function viajeCalificable(viaje) {
  if (viaje.estado === 'finalizado') return true;
  if (viaje.estado === 'cancelado') return false;
  const limite = new Date(new Date(viaje.fechaHora).getTime() + HORAS_PARA_CALIFICAR_SIN_FINALIZAR * 3600 * 1000);
  return new Date() >= limite;
}

/** Viajes publicados por el conductor, con el resumen de sus solicitudes. */
async function misViajes(conductorId) {
  const { rows } = await query(
    `SELECT ${COLUMNAS_VIAJE},
            COUNT(s.id) FILTER (WHERE s.estado = 'pendiente')::int AS "solicitudesPendientes",
            COUNT(s.id) FILTER (WHERE s.estado = 'aceptada')::int AS "pasajerosAceptados"
       FROM viaje v LEFT JOIN solicitud s ON s.viaje_id = v.id
      WHERE v.conductor_id = $1
      GROUP BY v.id
      ORDER BY (v.estado = 'activo' AND v.fecha_hora > NOW() - INTERVAL '2 hours') DESC, v.fecha_hora DESC
      LIMIT 100`,
    [conductorId]
  );
  return rows;
}

async function obtenerViajePropio(cliente, viajeId, conductorId) {
  const { rows } = await cliente.query(
    `SELECT id, conductor_id, estado, fecha_hora, origen, destino FROM viaje WHERE id = $1 FOR UPDATE`,
    [viajeId]
  );
  const viaje = rows[0];
  if (!viaje) throw noEncontrado('El viaje no existe');
  if (viaje.conductor_id !== conductorId) throw prohibido('Solo el conductor puede modificar este viaje');
  if (viaje.estado !== 'activo') throw conflicto(`El viaje ya está ${viaje.estado}`);
  return viaje;
}

/** El conductor marca el viaje como terminado; a partir de ahí todos se pueden calificar. */
async function finalizar(viajeId, conductorId) {
  await transaccion(async (cliente) => {
    const viaje = await obtenerViajePropio(cliente, viajeId, conductorId);
    const desde = new Date(viaje.fecha_hora.getTime() - MINUTOS_ANTES_PARA_FINALIZAR * 60 * 1000);
    if (new Date() < desde) {
      throw conflicto(`Solo puedes finalizar el viaje desde ${MINUTOS_ANTES_PARA_FINALIZAR} minutos antes de la salida`);
    }
    await cliente.query(`UPDATE viaje SET estado = 'finalizado' WHERE id = $1`, [viajeId]);
    // Las solicitudes que nunca se respondieron quedan rechazadas
    await cliente.query(
      `UPDATE solicitud SET estado = 'rechazada', respondido_en = NOW() WHERE viaje_id = $1 AND estado = 'pendiente'`,
      [viajeId]
    );
    const gente = await participantes(viajeId, cliente);
    for (const p of gente.filter((x) => x.papel === 'pasajero')) {
      await avisar(
        { usuarioId: p.id, tipo: 'viaje_finalizado', viajeId, mensaje: `Terminó tu viaje ${viaje.origen} → ${viaje.destino}. ¡Califica a tu conductor!` },
        cliente
      );
    }
  });
  return obtenerViaje(viajeId);
}

/** El conductor cancela un viaje activo; se avisa a quienes habían pedido cupo. */
async function cancelar(viajeId, conductorId) {
  await transaccion(async (cliente) => {
    const viaje = await obtenerViajePropio(cliente, viajeId, conductorId);
    await cliente.query(`UPDATE viaje SET estado = 'cancelado' WHERE id = $1`, [viajeId]);
    const { rows: afectados } = await cliente.query(
      `UPDATE solicitud SET estado = 'cancelada', respondido_en = NOW()
        WHERE viaje_id = $1 AND estado IN ('pendiente', 'aceptada') RETURNING pasajero_id`,
      [viajeId]
    );
    for (const s of afectados) {
      await avisar(
        { usuarioId: s.pasajero_id, tipo: 'viaje_cancelado', viajeId, mensaje: `El conductor canceló el viaje ${viaje.origen} → ${viaje.destino}.` },
        cliente
      );
    }
  });
  return obtenerViaje(viajeId);
}

/** Historial: viajes pasados donde el usuario fue conductor o pasajero aceptado. */
async function historial(usuarioId) {
  const { rows } = await query(
    `SELECT ${COLUMNAS_VIAJE},
            CASE WHEN v.conductor_id = $1 THEN 'conductor' ELSE 'pasajero' END AS "miPapel",
            u.nombre AS "conductorNombre",
            -- cuántos compañeros le quedan por calificar a este usuario en ese viaje
            CASE WHEN v.estado = 'finalizado'
                   OR (v.estado = 'activo' AND v.fecha_hora < NOW() - INTERVAL '${HORAS_PARA_CALIFICAR_SIN_FINALIZAR} hours')
                 THEN (
                   SELECT COUNT(*)::int FROM (
                     SELECT v.conductor_id AS id WHERE v.conductor_id <> $1
                     UNION
                     SELECT s2.pasajero_id FROM solicitud s2
                      WHERE s2.viaje_id = v.id AND s2.estado = 'aceptada' AND v.conductor_id = $1
                   ) c
                   WHERE NOT EXISTS (SELECT 1 FROM calificacion k
                                      WHERE k.viaje_id = v.id AND k.autor_id = $1 AND k.calificado_id = c.id)
                 )
                 ELSE 0 END AS "porCalificar"
       FROM viaje v JOIN usuario u ON u.id = v.conductor_id
      WHERE (v.conductor_id = $1
             OR EXISTS (SELECT 1 FROM solicitud s WHERE s.viaje_id = v.id AND s.pasajero_id = $1 AND s.estado = 'aceptada'))
        AND (v.estado <> 'activo' OR v.fecha_hora < NOW())
      ORDER BY v.fecha_hora DESC
      LIMIT 100`,
    [usuarioId]
  );
  return rows;
}

module.exports = {
  VENTANA_CHOQUE,
  validarDatosViaje,
  buscarChoques,
  publicar,
  obtenerViaje,
  buscar,
  detalle,
  participantes,
  viajeCalificable,
  misViajes,
  finalizar,
  cancelar,
  historial,
};
