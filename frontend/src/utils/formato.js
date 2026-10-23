// Formatos de fecha, hora y dinero en español de Colombia.

const ZONA = 'America/Bogota';

/** Fecha de hoy en Colombia como AAAA-MM-DD. */
export function hoyColombia(desplazamientoDias = 0) {
  const d = new Date(Date.now() - 5 * 3600 * 1000 + desplazamientoDias * 86400000);
  return d.toISOString().slice(0, 10);
}

/** "Hoy", "Mañana", "Ayer" o "sáb. 24 de oct." */
export function fechaCorta(fecha) {
  if (!fecha) return '';
  if (fecha === hoyColombia()) return 'Hoy';
  if (fecha === hoyColombia(1)) return 'Mañana';
  if (fecha === hoyColombia(-1)) return 'Ayer';
  const d = new Date(`${fecha}T12:00:00-05:00`);
  const texto = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: ZONA });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "06:15" → "6:15 a. m." */
export function horaLegible(hora) {
  if (!hora) return '';
  const [h, m] = hora.split(':').map(Number);
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

export const dinero = (valor) =>
  valor == null ? null : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

export const cupos = (n) => (n === 1 ? '1 cupo' : `${n} cupos`);

/** Fecha relativa para avisos: "hace 5 min", "hace 2 h", "24 oct." */
export function haceCuanto(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: ZONA });
}

export const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const LUGARES_SUGERIDOS = [
  'UTB Campus Tecnológico (Ternera)',
  'UTB Campus Casa Lemaitre (Manga)',
  'Turbaco',
  'Crespo',
  'Manga',
  'Bocagrande',
  'Castillogrande',
  'Pie de la Popa',
  'El Bosque',
  'Los Alpes',
  'Centro Histórico',
  'La Castellana',
  'San Fernando',
  'Los Ejecutivos',
  'Torices',
  'El Recreo',
  'Barrio Chino',
  'Arjona',
];
