// Utilidades compartidas por las pruebas de integración.
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { crearEsquema } = require('../src/db/init');
const { firmarToken } = require('../src/middleware/auth');

const api = () => request(app);

/** Deja la base de datos de pruebas vacía y con las tablas creadas. */
async function limpiarBase() {
  await crearEsquema();
  await pool.query('TRUNCATE aviso, calificacion, solicitud, viaje, usuario RESTART IDENTITY CASCADE');
}

let contador = 0;
/** Crea un usuario verificado directamente en la base y devuelve { usuario, token, auth }. */
async function crearUsuario({ rol = 'pasajero', nombre } = {}) {
  contador += 1;
  const n = contador; // se copia antes del await para que llamadas en paralelo no compartan número
  const hash = await bcrypt.hash('Clave12345', 4);
  const { rows } = await pool.query(
    `INSERT INTO usuario (nombre, correo, contrasena_hash, telefono, rol, placa, vehiculo, verificado)
     VALUES ($1, $2, $3, '3000000000', $4, $5, $6, TRUE) RETURNING id, nombre, correo, rol`,
    [
      nombre || `Usuario ${n}`,
      `usuario${n}@utb.edu.co`,
      hash,
      rol,
      rol === 'conductor' ? `ABC${String(100 + n).slice(-3)}` : null,
      rol === 'conductor' ? 'Carro de pruebas' : null,
    ]
  );
  const usuario = rows[0];
  const token = firmarToken(usuario);
  return { usuario, token, auth: { Authorization: `Bearer ${token}` } };
}

/** Fecha y hora de Colombia dentro de `horas` horas, en el formato del formulario. */
function fechaHoraEn(horas) {
  const d = new Date(Date.now() + horas * 3600 * 1000 - 5 * 3600 * 1000); // a hora de Colombia
  return { fecha: d.toISOString().slice(0, 10), hora: d.toISOString().slice(11, 16) };
}

/** Inserta un viaje directamente (permite fechas pasadas, útil para probar calificaciones). */
async function crearViaje(conductorId, { horas = 24, cupos = 3, origen = 'Turbaco', destino = 'UTB Campus Tecnológico', estado = 'activo' } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO viaje (conductor_id, origen, destino, punto_encuentro, fecha_hora, cupos_totales, cupos_disponibles, estado)
     VALUES ($1, $2, $3, 'Parque principal', NOW() + make_interval(mins => $4), $5, $5, $6) RETURNING id`,
    [conductorId, origen, destino, Math.round(horas * 60), cupos, estado]
  );
  return rows[0].id;
}

module.exports = { api, pool, limpiarBase, crearUsuario, crearViaje, fechaHoraEn };
