// Módulo de usuarios y acceso: único lugar donde se decide quién puede entrar a la plataforma (sección 9.5).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../../config');
const { query } = require('../../db/pool');
const { firmarToken } = require('../../middleware/auth');
const { enviarCorreo } = require('../correo/correo.service');
const { solicitudInvalida, noAutenticado, prohibido, conflicto, noEncontrado } = require('../../utils/errores');
const v = require('../../utils/validacion');

const RONDAS_BCRYPT = config.esPrueba ? 4 : 10;
const CAMPOS_PUBLICOS = 'id, nombre, correo, telefono, rol, placa, vehiculo, verificado, creado_en AS "creadoEn"';

async function enviarCorreoVerificacion(correo, nombre, token) {
  const enlace = `${config.frontendUrl}/verificar?token=${token}`;
  await enviarCorreo({
    para: correo,
    asunto: 'Confirma tu cuenta de Uniruta UTB',
    texto:
      `Hola ${nombre},\n\n` +
      `Gracias por registrarte en Uniruta UTB. Para activar tu cuenta abre este enlace:\n${enlace}\n\n` +
      `Si no fuiste tú, ignora este correo.`,
  });
}

/** RF-01: registro solo con correo institucional. */
async function registrar({ nombre, correo, contrasena, telefono }) {
  const nombreLimpio = v.exigirTexto(nombre, 'nombre', { min: 3, max: 100 });
  const correoLimpio = v.normalizarCorreo(correo);
  if (!v.esCorreoInstitucional(correoLimpio)) {
    throw solicitudInvalida(`Solo puedes registrarte con tu correo institucional @${config.dominioCorreo}`);
  }
  if (typeof contrasena !== 'string' || contrasena.length < 8) {
    throw solicitudInvalida('La contraseña debe tener al menos 8 caracteres');
  }
  if (contrasena.length > 72) throw solicitudInvalida('La contraseña no puede superar 72 caracteres');
  const telefonoLimpio = v.exigirTexto(telefono, 'teléfono', { min: 7, max: 20, opcional: true });

  const { rows: existentes } = await query('SELECT id FROM usuario WHERE correo = $1', [correoLimpio]);
  if (existentes[0]) throw conflicto('Ya existe una cuenta con ese correo');

  // RNF-01: la contraseña nunca se guarda en texto plano
  const hash = await bcrypt.hash(contrasena, RONDAS_BCRYPT);
  const token = crypto.randomBytes(32).toString('hex');
  const verificado = !config.exigirVerificacion;

  const { rows } = await query(
    `INSERT INTO usuario (nombre, correo, contrasena_hash, telefono, verificado, token_verificacion)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${CAMPOS_PUBLICOS}`,
    [nombreLimpio, correoLimpio, hash, telefonoLimpio, verificado, verificado ? null : token]
  );

  if (!verificado) await enviarCorreoVerificacion(correoLimpio, nombreLimpio, token);
  return { usuario: rows[0], requiereVerificacion: !verificado };
}

async function verificarCorreo(token) {
  if (!token || typeof token !== 'string') throw solicitudInvalida('Falta el código de verificación');
  const { rows } = await query(
    `UPDATE usuario SET verificado = TRUE, token_verificacion = NULL
      WHERE token_verificacion = $1 RETURNING ${CAMPOS_PUBLICOS}`,
    [token]
  );
  if (!rows[0]) throw solicitudInvalida('El enlace de verificación no es válido o ya fue usado');
  return { usuario: rows[0], token: firmarToken(rows[0]) };
}

async function reenviarVerificacion(correo) {
  const { rows } = await query('SELECT nombre, correo, verificado FROM usuario WHERE correo = $1', [
    v.normalizarCorreo(correo),
  ]);
  // Respuesta igual exista o no la cuenta, para no revelar qué correos están registrados
  if (!rows[0] || rows[0].verificado) return;
  const token = crypto.randomBytes(32).toString('hex');
  await query('UPDATE usuario SET token_verificacion = $1 WHERE correo = $2', [token, rows[0].correo]);
  await enviarCorreoVerificacion(rows[0].correo, rows[0].nombre, token);
}

/** RF-02: inicio de sesión. */
async function iniciarSesion({ correo, contrasena }) {
  const { rows } = await query(`SELECT ${CAMPOS_PUBLICOS}, contrasena_hash FROM usuario WHERE correo = $1`, [
    v.normalizarCorreo(correo),
  ]);
  const usuario = rows[0];
  const valida = usuario && typeof contrasena === 'string' && (await bcrypt.compare(contrasena, usuario.contrasena_hash));
  if (!valida) throw noAutenticado('Correo o contraseña incorrectos');
  if (!usuario.verificado) throw prohibido('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');

  delete usuario.contrasena_hash;
  return { usuario, token: firmarToken(usuario) };
}

async function obtenerPerfil(id) {
  const { rows } = await query(`SELECT ${CAMPOS_PUBLICOS} FROM usuario WHERE id = $1`, [id]);
  return rows[0];
}

/** Actualiza nombre, teléfono, rol y datos del vehículo. Para ser conductor se exige placa. */
async function actualizarPerfil(id, datos) {
  const actual = await obtenerPerfil(id);
  if (!actual) throw noEncontrado('Usuario no encontrado');

  const nombre = datos.nombre !== undefined ? v.exigirTexto(datos.nombre, 'nombre', { min: 3, max: 100 }) : actual.nombre;
  const telefono =
    datos.telefono !== undefined ? v.exigirTexto(datos.telefono, 'teléfono', { min: 7, max: 20, opcional: true }) : actual.telefono;
  const vehiculo =
    datos.vehiculo !== undefined ? v.exigirTexto(datos.vehiculo, 'vehículo', { max: 80, opcional: true }) : actual.vehiculo;

  let placa = actual.placa;
  if (datos.placa !== undefined) {
    placa = datos.placa ? v.normalizarPlaca(datos.placa) : null;
    if (placa && !v.esPlacaValida(placa)) throw solicitudInvalida('La placa no es válida (ejemplo: ABC123)');
  }

  const rol = datos.rol !== undefined ? datos.rol : actual.rol;
  if (!['pasajero', 'conductor'].includes(rol)) throw solicitudInvalida('El rol debe ser "pasajero" o "conductor"');
  if (rol === 'conductor' && !placa) throw solicitudInvalida('Para ser conductor debes registrar la placa de tu vehículo');

  const { rows } = await query(
    `UPDATE usuario SET nombre = $2, telefono = $3, rol = $4, placa = $5, vehiculo = $6
      WHERE id = $1 RETURNING ${CAMPOS_PUBLICOS}`,
    [id, nombre, telefono, rol, placa, vehiculo]
  );
  return rows[0];
}

/** Perfil que ven los demás: sin correo ni teléfono, con su reputación. */
async function perfilPublico(id) {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.rol, u.vehiculo, u.creado_en AS "creadoEn",
            ROUND(AVG(c.puntaje)::numeric, 1)::float AS "promedio",
            COUNT(c.id)::int AS "totalCalificaciones",
            (SELECT COUNT(*)::int FROM viaje WHERE conductor_id = u.id AND estado = 'finalizado') AS "viajesComoConductor"
       FROM usuario u
       LEFT JOIN calificacion c ON c.calificado_id = u.id
      WHERE u.id = $1
      GROUP BY u.id`,
    [id]
  );
  if (!rows[0]) throw noEncontrado('Usuario no encontrado');

  const { rows: comentarios } = await query(
    `SELECT c.puntaje, c.comentario, c.creado_en AS "creadoEn", a.nombre AS "autor"
       FROM calificacion c JOIN usuario a ON a.id = c.autor_id
      WHERE c.calificado_id = $1 ORDER BY c.creado_en DESC LIMIT 10`,
    [id]
  );
  return { ...rows[0], comentarios };
}

module.exports = {
  registrar,
  verificarCorreo,
  reenviarVerificacion,
  iniciarSesion,
  obtenerPerfil,
  actualizarPerfil,
  perfilPublico,
};
