// Funciones de validación puras (sin base de datos), fáciles de probar con Jest.
const config = require('../config');
const { solicitudInvalida } = require('./errores');

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_PLACA = /^[A-Z]{3}[0-9]{2}[0-9A-Z]$/; // Carros (ABC123) y motos (ABC12D) en Colombia
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const normalizarCorreo = (correo) => String(correo || '').trim().toLowerCase();

/** RF-01 / RNF-01: solo se aceptan correos del dominio institucional. */
function esCorreoInstitucional(correo, dominio = config.dominioCorreo) {
  const c = normalizarCorreo(correo);
  if (!REGEX_CORREO.test(c)) return false;
  return c.endsWith(`@${dominio.toLowerCase()}`);
}

const normalizarPlaca = (placa) => String(placa || '').replace(/[\s-]/g, '').toUpperCase();
const esPlacaValida = (placa) => REGEX_PLACA.test(normalizarPlaca(placa));

const textoLimpio = (valor) => (typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '');

/** Lanza 400 si el campo de texto está vacío o es demasiado largo. Devuelve el texto limpio. */
function exigirTexto(valor, campo, { min = 1, max = 120, opcional = false } = {}) {
  const t = textoLimpio(valor);
  if (!t) {
    if (opcional) return null;
    throw solicitudInvalida(`El campo "${campo}" es obligatorio`);
  }
  if (t.length < min) throw solicitudInvalida(`El campo "${campo}" debe tener al menos ${min} caracteres`);
  if (t.length > max) throw solicitudInvalida(`El campo "${campo}" no puede superar ${max} caracteres`);
  return t;
}

function exigirEntero(valor, campo, { min, max, opcional = false } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (opcional) return null;
    throw solicitudInvalida(`El campo "${campo}" es obligatorio`);
  }
  const n = Number(valor);
  if (!Number.isInteger(n)) throw solicitudInvalida(`El campo "${campo}" debe ser un número entero`);
  if (min !== undefined && n < min) throw solicitudInvalida(`El campo "${campo}" debe ser mayor o igual a ${min}`);
  if (max !== undefined && n > max) throw solicitudInvalida(`El campo "${campo}" debe ser menor o igual a ${max}`);
  return n;
}

const esFecha = (v) => REGEX_FECHA.test(String(v || '')) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const esHora = (v) => REGEX_HORA.test(String(v || ''));

/**
 * Convierte fecha (AAAA-MM-DD) + hora (HH:MM) de Colombia (UTC-5, sin horario de verano)
 * en un objeto Date. Así el servidor no depende de la zona horaria de la máquina.
 */
function fechaHoraColombia(fecha, hora) {
  if (!esFecha(fecha)) throw solicitudInvalida('La fecha debe tener el formato AAAA-MM-DD');
  if (!esHora(hora)) throw solicitudInvalida('La hora debe tener el formato HH:MM (24 horas)');
  return new Date(`${fecha}T${hora}:00-05:00`);
}

/** Quita tildes y pasa a minúsculas, para buscar "Turbaco" con "turbacó" o "Crespo" con "crespo". */
const normalizarBusqueda = (texto) =>
  textoLimpio(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

module.exports = {
  normalizarCorreo,
  esCorreoInstitucional,
  normalizarPlaca,
  esPlacaValida,
  textoLimpio,
  exigirTexto,
  exigirEntero,
  esFecha,
  esHora,
  fechaHoraColombia,
  normalizarBusqueda,
};
