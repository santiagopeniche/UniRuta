/**
 * Carga datos de demostración. BORRA todos los datos existentes antes de cargar.
 *   npm run db:seed            → usuarios y viajes de ejemplo
 *   npm run db:seed -- --carga → además 200 viajes extra para la prueba de rendimiento (RNF-03)
 *
 * Todas las cuentas de ejemplo usan la contraseña: Uniruta2026
 * (solo para desarrollo local; no usar en el servidor público).
 */
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');
const { crearEsquema } = require('./init');

const CONTRASENA_DEMO = 'Uniruta2026';
const CAMPUS = 'UTB Campus Tecnológico (Ternera)';
const CAMPUS_MANGA = 'UTB Campus Casa Lemaitre (Manga)';
const BARRIOS = [
  'Turbaco',
  'Crespo',
  'Manga',
  'Bocagrande',
  'Pie de la Popa',
  'El Bosque',
  'Los Alpes',
  'Castillogrande',
  'Centro Histórico',
  'La Castellana',
  'San Fernando',
  'Los Ejecutivos',
  'Torices',
  'El Recreo',
  'Barrio Chino',
];

const USUARIOS = [
  { nombre: 'Laura Martínez', correo: 'lmartinez@utb.edu.co', rol: 'conductor', placa: 'GHT482', vehiculo: 'Chevrolet Spark gris', telefono: '3001234567' },
  { nombre: 'Andrés Herrera', correo: 'aherrera@utb.edu.co', rol: 'conductor', placa: 'KLM905', vehiculo: 'Renault Logan blanco', telefono: '3017654321' },
  { nombre: 'Camila Ríos', correo: 'crios@utb.edu.co', rol: 'conductor', placa: 'FTR217', vehiculo: 'Kia Picanto rojo', telefono: '3024567890' },
  { nombre: 'Julián Pérez', correo: 'jperez@utb.edu.co', rol: 'pasajero', telefono: '3109876543' },
  { nombre: 'Valentina Gómez', correo: 'vgomez@utb.edu.co', rol: 'pasajero', telefono: '3152223344' },
  { nombre: 'Mateo Castillo', correo: 'mcastillo@utb.edu.co', rol: 'pasajero', telefono: '3185556677' },
];

/** Fecha en hora de Colombia, a `dias` días de hoy y a la hora indicada. */
function enDias(dias, hora, minuto = 0) {
  const ahoraColombia = new Date(Date.now() - 5 * 3600 * 1000);
  const base = new Date(Date.UTC(ahoraColombia.getUTCFullYear(), ahoraColombia.getUTCMonth(), ahoraColombia.getUTCDate() + dias));
  return new Date(base.getTime() + (hora + 5) * 3600 * 1000 + minuto * 60 * 1000);
}

async function sembrar({ carga = false } = {}) {
  await crearEsquema();
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('TRUNCATE aviso, calificacion, solicitud, viaje, usuario RESTART IDENTITY CASCADE');

    const hash = await bcrypt.hash(CONTRASENA_DEMO, 10);
    const ids = {};
    for (const u of USUARIOS) {
      const { rows } = await c.query(
        `INSERT INTO usuario (nombre, correo, contrasena_hash, telefono, rol, placa, vehiculo, verificado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id`,
        [u.nombre, u.correo, hash, u.telefono, u.rol, u.placa || null, u.vehiculo || null]
      );
      ids[u.correo] = rows[0].id;
    }
    const laura = ids['lmartinez@utb.edu.co'];
    const andres = ids['aherrera@utb.edu.co'];
    const camila = ids['crios@utb.edu.co'];
    const julian = ids['jperez@utb.edu.co'];
    const valentina = ids['vgomez@utb.edu.co'];
    const mateo = ids['mcastillo@utb.edu.co'];

    const viaje = async (conductor, origen, destino, punto, fecha, cupos, aporte, notas, estado = 'activo', disponibles = cupos) => {
      const { rows } = await c.query(
        `INSERT INTO viaje (conductor_id, origen, destino, punto_encuentro, fecha_hora, cupos_totales, cupos_disponibles, aporte_sugerido, notas, estado)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [conductor, origen, destino, punto, fecha, cupos, disponibles, aporte, notas, estado]
      );
      return rows[0].id;
    };

    // Viajes próximos
    const v1 = await viaje(laura, 'Turbaco', CAMPUS, 'Parque principal de Turbaco, frente a la iglesia', enDias(1, 6, 15), 3, 5000, 'Salgo puntual. Clase a las 7.');
    await viaje(andres, 'Crespo', CAMPUS, 'Estación de Transcaribe de Crespo', enDias(1, 6, 30), 4, 6000, null);
    await viaje(camila, 'Manga', CAMPUS, 'Supermercado de la 3ra avenida de Manga', enDias(1, 6, 40), 2, 5000, 'Aire acondicionado y buena música');
    await viaje(laura, CAMPUS, 'Turbaco', 'Portería principal del campus', enDias(1, 17, 30), 3, 5000, null);
    await viaje(andres, CAMPUS, 'Bocagrande', 'Parqueadero de estudiantes', enDias(1, 18, 0), 3, 7000, 'Paso por Manga y Castillogrande');
    await viaje(camila, 'Pie de la Popa', CAMPUS_MANGA, 'Frente a la Clínica Cartagena del Mar', enDias(2, 7, 0), 3, 4000, null);
    await viaje(andres, 'El Bosque', CAMPUS, 'Centro comercial Los Ejecutivos', enDias(2, 9, 30), 2, 4000, null);
    await viaje(laura, 'Turbaco', CAMPUS, 'Parque principal de Turbaco, frente a la iglesia', enDias(2, 6, 15), 3, 5000, null);

    // Solicitudes sobre el primer viaje
    await c.query(`INSERT INTO solicitud (viaje_id, pasajero_id, estado, mensaje, respondido_en) VALUES ($1,$2,'aceptada','Voy con morral pequeño', NOW())`, [v1, julian]);
    await c.query(`UPDATE viaje SET cupos_disponibles = cupos_disponibles - 1 WHERE id = $1`, [v1]);
    await c.query(`INSERT INTO solicitud (viaje_id, pasajero_id, estado, mensaje) VALUES ($1,$2,'pendiente','Me subo en la entrada de Turbaco')`, [v1, valentina]);

    // Viajes pasados, finalizados, con calificaciones
    const pasado = await viaje(laura, 'Turbaco', CAMPUS, 'Parque principal de Turbaco', enDias(-2, 6, 15), 3, 5000, null, 'finalizado', 1);
    await c.query(`INSERT INTO solicitud (viaje_id, pasajero_id, estado) VALUES ($1,$2,'aceptada'),($1,$3,'aceptada')`, [pasado, julian, mateo]);
    await c.query(
      `INSERT INTO calificacion (viaje_id, autor_id, calificado_id, puntaje, comentario) VALUES
         ($1,$2,$3,5,'Muy puntual y maneja con cuidado'),
         ($1,$4,$3,4,'Todo bien, buena conversación'),
         ($1,$3,$2,5,'Excelente pasajero')`,
      [pasado, julian, laura, mateo]
    );
    const pasado2 = await viaje(andres, 'Crespo', CAMPUS, 'Estación de Transcaribe de Crespo', enDias(-1, 6, 30), 4, 6000, null, 'finalizado', 3);
    await c.query(`INSERT INTO solicitud (viaje_id, pasajero_id, estado) VALUES ($1,$2,'aceptada')`, [pasado2, valentina]);
    await c.query(`INSERT INTO calificacion (viaje_id, autor_id, calificado_id, puntaje, comentario) VALUES ($1,$2,$3,5,'Súper amable')`, [pasado2, valentina, andres]);
    const pasado3 = await viaje(camila, 'Manga', CAMPUS, 'Supermercado de la 3ra avenida', enDias(-1, 6, 40), 2, 5000, null, 'finalizado', 1);
    await c.query(`INSERT INTO solicitud (viaje_id, pasajero_id, estado) VALUES ($1,$2,'aceptada')`, [pasado3, julian]);

    await c.query(
      `INSERT INTO aviso (usuario_id, tipo, mensaje, viaje_id) VALUES
         ($1,'solicitud_nueva','Valentina Gómez te pidió un cupo en tu viaje Turbaco → ${CAMPUS}.',$2),
         ($3,'solicitud_aceptada','¡Tienes cupo! El conductor aceptó tu solicitud para el viaje Turbaco → ${CAMPUS}.',$2),
         ($3,'viaje_finalizado','Terminó tu viaje Manga → ${CAMPUS}. ¡Califica a tu conductor!',$4)`,
      [laura, v1, julian, pasado3]
    );

    if (carga) {
      // 200 viajes de prueba repartidos en los próximos 14 días (RNF-03)
      const conductores = [laura, andres, camila];
      for (let i = 0; i < 200; i += 1) {
        const barrio = BARRIOS[i % BARRIOS.length];
        const haciaCampus = i % 3 !== 0;
        await viaje(
          conductores[i % 3],
          haciaCampus ? barrio : CAMPUS,
          haciaCampus ? CAMPUS : barrio,
          `Punto de encuentro ${i + 1}`,
          enDias(3 + (i % 14), 5 + (i % 15), (i * 7) % 60),
          1 + (i % 4),
          3000 + (i % 5) * 1000,
          null
        );
      }
    }

    await c.query('COMMIT');
    console.log(`✔ Datos de demostración cargados${carga ? ' (con 200 viajes extra)' : ''}.`);
    console.log(`  Cuentas: ${USUARIOS.map((u) => u.correo).join(', ')}`);
    console.log(`  Contraseña de todas: ${CONTRASENA_DEMO}`);
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

module.exports = { sembrar, CONTRASENA_DEMO };

if (require.main === module) {
  sembrar({ carga: process.argv.includes('--carga') })
    .catch((e) => {
      console.error('✘ Error cargando datos:', e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
