// API simulada para la demo navegable (npm run build:demo).
// Imita las reglas del backend real con datos guardados en el navegador, sin servidor.
import { ErrorApi, sesion } from './http';

const CLAVE_DB = 'uniruta_demo_db_v1';
const CAMPUS = 'UTB Campus Tecnológico (Ternera)';
const CAMPUS_MANGA = 'UTB Campus Casa Lemaitre (Manga)';
export const CONTRASENA_DEMO = 'Uniruta2026';

export const CUENTAS_DEMO = [
  { correo: 'lmartinez@utb.edu.co', nombre: 'Laura Martínez', descripcion: 'Conductora, viaja desde Turbaco' },
  { correo: 'jperez@utb.edu.co', nombre: 'Julián Pérez', descripcion: 'Pasajero, tiene un cupo confirmado' },
  { correo: 'vgomez@utb.edu.co', nombre: 'Valentina Gómez', descripcion: 'Pasajera, con una solicitud pendiente' },
];

// ---------- utilidades de fecha (hora de Colombia, UTC-5) ----------
const MS_HORA = 3600 * 1000;
function enDias(dias, hora, minuto = 0) {
  const col = new Date(Date.now() - 5 * MS_HORA);
  const base = Date.UTC(col.getUTCFullYear(), col.getUTCMonth(), col.getUTCDate() + dias);
  return new Date(base + (hora + 5) * MS_HORA + minuto * 60000).toISOString();
}
const partesColombia = (iso) => {
  const d = new Date(new Date(iso).getTime() - 5 * MS_HORA).toISOString();
  return { fecha: d.slice(0, 10), hora: d.slice(11, 16) };
};
const sinTildes = (t) =>
  String(t || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// ---------- datos iniciales (los mismos del seed del backend) ----------
function datosIniciales() {
  const u = (id, nombre, correo, rol, extra = {}) => ({
    id, nombre, correo, contrasena: CONTRASENA_DEMO, rol, verificado: true, telefono: '300 000 00' + id,
    placa: null, vehiculo: null, creadoEn: enDias(-40, 9), ...extra,
  });
  const usuarios = [
    u(1, 'Laura Martínez', 'lmartinez@utb.edu.co', 'conductor', { placa: 'GHT482', vehiculo: 'Chevrolet Spark gris', telefono: '300 123 4567' }),
    u(2, 'Andrés Herrera', 'aherrera@utb.edu.co', 'conductor', { placa: 'KLM905', vehiculo: 'Renault Logan blanco', telefono: '301 765 4321' }),
    u(3, 'Camila Ríos', 'crios@utb.edu.co', 'conductor', { placa: 'FTR217', vehiculo: 'Kia Picanto rojo', telefono: '302 456 7890' }),
    u(4, 'Julián Pérez', 'jperez@utb.edu.co', 'pasajero', { telefono: '310 987 6543' }),
    u(5, 'Valentina Gómez', 'vgomez@utb.edu.co', 'pasajero', { telefono: '315 222 3344' }),
    u(6, 'Mateo Castillo', 'mcastillo@utb.edu.co', 'pasajero', { telefono: '318 555 6677' }),
  ];
  let idV = 0;
  const viajes = [];
  const v = (conductorId, origen, destino, puntoEncuentro, fechaHora, cupos, aporte, notas = null, estado = 'activo', disponibles = cupos) => {
    idV += 1;
    viajes.push({ id: idV, conductorId, origen, destino, puntoEncuentro, fechaHora, cuposTotales: cupos, cuposDisponibles: disponibles, aporteSugerido: aporte, notas, estado });
    return idV;
  };
  v(1, 'Turbaco', CAMPUS, 'Parque principal de Turbaco, frente a la iglesia', enDias(1, 6, 15), 3, 5000, 'Salgo puntual. Clase a las 7.', 'activo', 2);
  v(2, 'Crespo', CAMPUS, 'Estación de Transcaribe de Crespo', enDias(1, 6, 30), 4, 6000);
  v(3, 'Manga', CAMPUS, 'Supermercado de la 3ra avenida de Manga', enDias(1, 6, 40), 2, 5000, 'Aire acondicionado y buena música');
  v(1, CAMPUS, 'Turbaco', 'Portería principal del campus', enDias(1, 17, 30), 3, 5000);
  v(2, CAMPUS, 'Bocagrande', 'Parqueadero de estudiantes', enDias(1, 18, 0), 3, 7000, 'Paso por Manga y Castillogrande');
  v(3, 'Pie de la Popa', CAMPUS_MANGA, 'Frente a la Clínica Cartagena del Mar', enDias(2, 7, 0), 3, 4000);
  v(2, 'El Bosque', CAMPUS, 'Centro comercial Los Ejecutivos', enDias(2, 9, 30), 2, 4000);
  v(1, 'Turbaco', CAMPUS, 'Parque principal de Turbaco, frente a la iglesia', enDias(2, 6, 15), 3, 5000);
  const p1 = v(1, 'Turbaco', CAMPUS, 'Parque principal de Turbaco', enDias(-2, 6, 15), 3, 5000, null, 'finalizado', 1);
  const p2 = v(2, 'Crespo', CAMPUS, 'Estación de Transcaribe de Crespo', enDias(-1, 6, 30), 4, 6000, null, 'finalizado', 3);
  const p3 = v(3, 'Manga', CAMPUS, 'Supermercado de la 3ra avenida', enDias(-1, 6, 40), 2, 5000, null, 'finalizado', 1);

  const ahora = new Date().toISOString();
  const solicitudes = [
    { id: 1, viajeId: 1, pasajeroId: 4, estado: 'aceptada', mensaje: 'Voy con morral pequeño', creadoEn: ahora },
    { id: 2, viajeId: 1, pasajeroId: 5, estado: 'pendiente', mensaje: 'Me subo en la entrada de Turbaco', creadoEn: ahora },
    { id: 3, viajeId: p1, pasajeroId: 4, estado: 'aceptada', mensaje: null, creadoEn: ahora },
    { id: 4, viajeId: p1, pasajeroId: 6, estado: 'aceptada', mensaje: null, creadoEn: ahora },
    { id: 5, viajeId: p2, pasajeroId: 5, estado: 'aceptada', mensaje: null, creadoEn: ahora },
    { id: 6, viajeId: p3, pasajeroId: 4, estado: 'aceptada', mensaje: null, creadoEn: ahora },
  ];
  const calificaciones = [
    { id: 1, viajeId: p1, autorId: 4, calificadoId: 1, puntaje: 5, comentario: 'Muy puntual y maneja con cuidado', creadoEn: ahora },
    { id: 2, viajeId: p1, autorId: 6, calificadoId: 1, puntaje: 4, comentario: 'Todo bien, buena conversación', creadoEn: ahora },
    { id: 3, viajeId: p1, autorId: 1, calificadoId: 4, puntaje: 5, comentario: 'Excelente pasajero', creadoEn: ahora },
    { id: 4, viajeId: p2, autorId: 5, calificadoId: 2, puntaje: 5, comentario: 'Súper amable', creadoEn: ahora },
  ];
  const avisos = [
    { id: 1, usuarioId: 1, tipo: 'solicitud_nueva', mensaje: `Valentina Gómez te pidió un cupo en tu viaje Turbaco → ${CAMPUS}.`, viajeId: 1, leido: false, creadoEn: ahora },
    { id: 2, usuarioId: 4, tipo: 'solicitud_aceptada', mensaje: `¡Tienes cupo! El conductor aceptó tu solicitud para el viaje Turbaco → ${CAMPUS}.`, viajeId: 1, leido: false, creadoEn: ahora },
    { id: 3, usuarioId: 4, tipo: 'viaje_finalizado', mensaje: `Terminó tu viaje Manga → ${CAMPUS}. ¡Califica a tu conductor!`, viajeId: p3, leido: false, creadoEn: ahora },
  ];
  return { usuarios, viajes, solicitudes, calificaciones, avisos, ultimoToken: null };
}

// ---------- almacenamiento (en el navegador; si no está disponible, en memoria) ----------
let memoria = null;
function cargar() {
  if (memoria) return memoria;
  try {
    const guardado = localStorage.getItem(CLAVE_DB);
    if (guardado) memoria = JSON.parse(guardado);
  } catch {
    /* sin almacenamiento: se usa memoria */
  }
  if (!memoria) memoria = datosIniciales();
  return memoria;
}
function guardar() {
  try {
    localStorage.setItem(CLAVE_DB, JSON.stringify(memoria));
  } catch {
    /* sin almacenamiento */
  }
}
export function reiniciarDemo() {
  memoria = datosIniciales();
  guardar();
}

const espera = () => new Promise((r) => setTimeout(r, 120));
const error = (status, mensaje) => {
  throw new ErrorApi(status, mensaje);
};
const sigId = (lista) => lista.reduce((m, x) => Math.max(m, x.id), 0) + 1;

function yo(db) {
  const token = sesion.token();
  const id = token?.startsWith('demo:') ? Number(token.slice(5)) : null;
  const u = db.usuarios.find((x) => x.id === id);
  if (!u) error(401, 'Debes iniciar sesión');
  return u;
}
const publico = ({ contrasena, token, ...u }) => u;
const reputacion = (db, usuarioId) => {
  const c = db.calificaciones.filter((k) => k.calificadoId === usuarioId);
  return {
    promedio: c.length ? Math.round((c.reduce((s, k) => s + k.puntaje, 0) / c.length) * 10) / 10 : null,
    totalCalificaciones: c.length,
  };
};
const vistaViaje = (v) => ({ ...v, ...partesColombia(v.fechaHora) });
const ruta = (v) => `${v.origen} → ${v.destino}`;
function avisar(db, usuarioId, tipo, mensaje, viajeId) {
  db.avisos.push({ id: sigId(db.avisos), usuarioId, tipo, mensaje, viajeId, leido: false, creadoEn: new Date().toISOString() });
}
const participantes = (db, v) => [
  { ...db.usuarios.find((u) => u.id === v.conductorId), papel: 'conductor' },
  ...db.solicitudes
    .filter((s) => s.viajeId === v.id && s.estado === 'aceptada')
    .map((s) => ({ ...db.usuarios.find((u) => u.id === s.pasajeroId), papel: 'pasajero' })),
];
const calificable = (v) =>
  v.estado === 'finalizado' || (v.estado === 'activo' && Date.now() >= new Date(v.fechaHora).getTime() + 2 * MS_HORA);
function buscarViaje(db, id) {
  const v = db.viajes.find((x) => x.id === Number(id));
  if (!v) error(404, 'El viaje no existe');
  return v;
}
function texto(valor, campo, { min = 1, max = 120, opcional = false } = {}) {
  const t = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
  if (!t) return opcional ? null : error(400, `El campo "${campo}" es obligatorio`);
  if (t.length < min) error(400, `El campo "${campo}" debe tener al menos ${min} caracteres`);
  if (t.length > max) error(400, `El campo "${campo}" no puede superar ${max} caracteres`);
  return t;
}

// ---------- la API simulada ----------
async function ejecutar(fn) {
  await espera();
  const db = cargar();
  const r = fn(db);
  guardar();
  return structuredClone(r);
}

export const apiDemo = {
  registro: (d) =>
    ejecutar((db) => {
      const nombre = texto(d.nombre, 'nombre', { min: 3, max: 100 });
      const correo = String(d.correo || '').trim().toLowerCase();
      if (!/^[^\s@]+@utb\.edu\.co$/.test(correo)) error(400, 'Solo puedes registrarte con tu correo institucional @utb.edu.co');
      if (!d.contrasena || d.contrasena.length < 8) error(400, 'La contraseña debe tener al menos 8 caracteres');
      if (db.usuarios.some((u) => u.correo === correo)) error(409, 'Ya existe una cuenta con ese correo');
      const token = Math.random().toString(16).slice(2) + Date.now().toString(16);
      db.usuarios.push({
        id: sigId(db.usuarios), nombre, correo, contrasena: d.contrasena, telefono: d.telefono || null, rol: 'pasajero',
        placa: null, vehiculo: null, verificado: false, token, creadoEn: new Date().toISOString(),
      });
      db.ultimoToken = token;
      return { mensaje: 'Cuenta creada. Te enviamos un correo para confirmarla.', requiereVerificacion: true };
    }),
  ultimoTokenVerificacion: () => cargar().ultimoToken,

  verificar: (token) =>
    ejecutar((db) => {
      const u = db.usuarios.find((x) => x.token && x.token === token);
      if (!u) error(400, 'El enlace de verificación no es válido o ya fue usado');
      u.verificado = true;
      u.token = null;
      return { usuario: publico(u), token: `demo:${u.id}` };
    }),
  reenviarVerificacion: () => ejecutar(() => ({ mensaje: 'Si la cuenta existe y no está confirmada, te enviamos un nuevo correo.' })),

  login: (correo, contrasena) =>
    ejecutar((db) => {
      const u = db.usuarios.find((x) => x.correo === String(correo || '').trim().toLowerCase());
      if (!u || u.contrasena !== contrasena) error(401, 'Correo o contraseña incorrectos');
      if (!u.verificado) error(403, 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');
      return { usuario: publico(u), token: `demo:${u.id}` };
    }),
  yo: () => ejecutar((db) => ({ usuario: publico(yo(db)) })),

  actualizarPerfil: (d) =>
    ejecutar((db) => {
      const u = yo(db);
      if (d.nombre !== undefined) u.nombre = texto(d.nombre, 'nombre', { min: 3, max: 100 });
      if (d.telefono !== undefined) u.telefono = texto(d.telefono, 'teléfono', { min: 7, max: 20, opcional: true });
      if (d.vehiculo !== undefined) u.vehiculo = texto(d.vehiculo, 'vehículo', { max: 80, opcional: true });
      if (d.placa !== undefined) {
        const placa = d.placa ? String(d.placa).replace(/[\s-]/g, '').toUpperCase() : null;
        if (placa && !/^[A-Z]{3}[0-9]{2}[0-9A-Z]$/.test(placa)) error(400, 'La placa no es válida (ejemplo: ABC123)');
        u.placa = placa;
      }
      const rol = d.rol ?? u.rol;
      if (rol === 'conductor' && !u.placa) error(400, 'Para ser conductor debes registrar la placa de tu vehículo');
      u.rol = rol;
      return { usuario: publico(u) };
    }),

  perfilPublico: (id) =>
    ejecutar((db) => {
      yo(db);
      const u = db.usuarios.find((x) => x.id === Number(id));
      if (!u) error(404, 'Usuario no encontrado');
      const comentarios = db.calificaciones
        .filter((c) => c.calificadoId === u.id)
        .map((c) => ({ puntaje: c.puntaje, comentario: c.comentario, creadoEn: c.creadoEn, autor: db.usuarios.find((a) => a.id === c.autorId).nombre }))
        .reverse();
      return {
        usuario: {
          id: u.id, nombre: u.nombre, rol: u.rol, vehiculo: u.vehiculo, creadoEn: u.creadoEn, ...reputacion(db, u.id),
          viajesComoConductor: db.viajes.filter((v) => v.conductorId === u.id && v.estado === 'finalizado').length,
          comentarios,
        },
      };
    }),

  buscarViajes: (f = {}) =>
    ejecutar((db) => {
      const u = yo(db);
      const o = sinTildes(f.origen);
      const d = sinTildes(f.destino);
      const viajes = db.viajes
        .filter((v) => v.estado === 'activo' && new Date(v.fechaHora) > new Date() && v.cuposDisponibles > 0 && v.conductorId !== u.id)
        .map(vistaViaje)
        .filter((v) => (!o || sinTildes(v.origen).includes(o)) && (!d || sinTildes(v.destino).includes(d)))
        .filter((v) => (!f.fecha || v.fecha === f.fecha) && (!f.horaDesde || v.hora >= f.horaDesde) && (!f.horaHasta || v.hora <= f.horaHasta))
        .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
        .map((v) => {
          const c = db.usuarios.find((x) => x.id === v.conductorId);
          const s = db.solicitudes.find((x) => x.viajeId === v.id && x.pasajeroId === u.id);
          return { ...v, conductor: { id: c.id, nombre: c.nombre, vehiculo: c.vehiculo, ...reputacion(db, c.id) }, miSolicitud: s?.estado || null };
        });
      return { viajes };
    }),

  publicarViaje: (d) =>
    ejecutar((db) => {
      const u = yo(db);
      if (u.rol !== 'conductor') error(403, 'Para publicar viajes debes activar el modo conductor y registrar tu placa en tu perfil');
      const origen = texto(d.origen, 'origen', { min: 3 });
      const destino = texto(d.destino, 'destino', { min: 3 });
      if (sinTildes(origen) === sinTildes(destino)) error(400, 'El origen y el destino no pueden ser iguales');
      const puntoEncuentro = texto(d.puntoEncuentro, 'punto de encuentro', { min: 3, max: 160 });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '') || !/^\d{2}:\d{2}$/.test(d.hora || '')) error(400, 'Indica la fecha y la hora del viaje');
      const fechaHora = new Date(`${d.fecha}T${d.hora}:00-05:00`);
      if (fechaHora <= new Date()) error(400, 'La fecha y hora del viaje deben ser futuras');
      const cupos = Number(d.cupos);
      if (!Number.isInteger(cupos) || cupos < 1 || cupos > 6) error(400, 'El campo "cupos" debe estar entre 1 y 6');
      const aporte = d.aporteSugerido === '' || d.aporteSugerido == null ? null : Number(d.aporteSugerido);
      const viaje = {
        id: sigId(db.viajes), conductorId: u.id, origen, destino, puntoEncuentro, fechaHora: fechaHora.toISOString(),
        cuposTotales: cupos, cuposDisponibles: cupos, aporteSugerido: aporte, notas: texto(d.notas, 'notas', { max: 300, opcional: true }), estado: 'activo',
      };
      db.viajes.push(viaje);
      return { viaje: vistaViaje(viaje) };
    }),

  viaje: (id) =>
    ejecutar((db) => {
      const u = yo(db);
      const v = buscarViaje(db, id);
      const c = db.usuarios.find((x) => x.id === v.conductorId);
      const esConductor = v.conductorId === u.id;
      const mia = db.solicitudes.find((s) => s.viajeId === v.id && s.pasajeroId === u.id);
      const confirmado = esConductor || mia?.estado === 'aceptada';
      const conductor = { id: c.id, nombre: c.nombre, vehiculo: c.vehiculo, ...reputacion(db, c.id) };
      if (confirmado) Object.assign(conductor, { telefono: c.telefono, placa: c.placa });
      const r = { ...vistaViaje(v), conductor, esConductor, miSolicitud: mia ? { id: mia.id, estado: mia.estado, mensaje: mia.mensaje } : null };
      if (confirmado) {
        r.pasajeros = participantes(db, v)
          .filter((p) => p.papel === 'pasajero')
          .map((p) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono }));
      }
      if (esConductor) {
        r.solicitudes = db.solicitudes
          .filter((s) => s.viajeId === v.id)
          .sort((a, b) => (a.estado === 'pendiente' ? -1 : 0) - (b.estado === 'pendiente' ? -1 : 0))
          .map((s) => {
            const p = db.usuarios.find((x) => x.id === s.pasajeroId);
            return {
              id: s.id, estado: s.estado, mensaje: s.mensaje, creadoEn: s.creadoEn,
              pasajero: { id: p.id, nombre: p.nombre, telefono: s.estado === 'aceptada' ? p.telefono : null, ...reputacion(db, p.id) },
            };
          });
      }
      r.puedeCalificar = confirmado && calificable(v);
      return { viaje: r };
    }),

  misViajes: () =>
    ejecutar((db) => {
      const u = yo(db);
      const viajes = db.viajes
        .filter((v) => v.conductorId === u.id)
        .map((v) => ({
          ...vistaViaje(v),
          solicitudesPendientes: db.solicitudes.filter((s) => s.viajeId === v.id && s.estado === 'pendiente').length,
          pasajerosAceptados: db.solicitudes.filter((s) => s.viajeId === v.id && s.estado === 'aceptada').length,
        }))
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
      return { viajes };
    }),

  historial: () =>
    ejecutar((db) => {
      const u = yo(db);
      const viajes = db.viajes
        .filter((v) => (v.estado !== 'activo' || new Date(v.fechaHora) < new Date()) && participantes(db, v).some((p) => p.id === u.id))
        .map((v) => {
          const miPapel = v.conductorId === u.id ? 'conductor' : 'pasajero';
          const objetivo = participantes(db, v).filter((p) => (miPapel === 'conductor' ? p.papel === 'pasajero' : p.papel === 'conductor'));
          const porCalificar = calificable(v)
            ? objetivo.filter((p) => !db.calificaciones.some((k) => k.viajeId === v.id && k.autorId === u.id && k.calificadoId === p.id)).length
            : 0;
          return { ...vistaViaje(v), miPapel, conductorNombre: db.usuarios.find((x) => x.id === v.conductorId).nombre, porCalificar };
        })
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
      return { viajes };
    }),

  finalizarViaje: (id) =>
    ejecutar((db) => {
      const u = yo(db);
      const v = buscarViaje(db, id);
      if (v.conductorId !== u.id) error(403, 'Solo el conductor puede modificar este viaje');
      if (v.estado !== 'activo') error(409, `El viaje ya está ${v.estado}`);
      // El backend real solo deja finalizar desde 30 minutos antes de la salida;
      // en la demo se permite siempre para poder probar el flujo completo sin esperar.
      v.estado = 'finalizado';
      db.solicitudes.filter((s) => s.viajeId === v.id && s.estado === 'pendiente').forEach((s) => (s.estado = 'rechazada'));
      participantes(db, v)
        .filter((p) => p.papel === 'pasajero')
        .forEach((p) => avisar(db, p.id, 'viaje_finalizado', `Terminó tu viaje ${ruta(v)}. ¡Califica a tu conductor!`, v.id));
      return { viaje: vistaViaje(v) };
    }),

  cancelarViaje: (id) =>
    ejecutar((db) => {
      const u = yo(db);
      const v = buscarViaje(db, id);
      if (v.conductorId !== u.id) error(403, 'Solo el conductor puede modificar este viaje');
      if (v.estado !== 'activo') error(409, `El viaje ya está ${v.estado}`);
      v.estado = 'cancelado';
      db.solicitudes
        .filter((s) => s.viajeId === v.id && ['pendiente', 'aceptada'].includes(s.estado))
        .forEach((s) => {
          s.estado = 'cancelada';
          avisar(db, s.pasajeroId, 'viaje_cancelado', `El conductor canceló el viaje ${ruta(v)}.`, v.id);
        });
      return { viaje: vistaViaje(v) };
    }),

  pedirCupo: (viajeId, mensaje) =>
    ejecutar((db) => {
      const u = yo(db);
      const v = buscarViaje(db, viajeId);
      if (v.conductorId === u.id) error(400, 'No puedes pedir cupo en tu propio viaje');
      if (v.estado !== 'activo') error(409, 'Este viaje ya no está disponible');
      if (new Date(v.fechaHora) <= new Date()) error(409, 'Este viaje ya salió');
      if (v.cuposDisponibles <= 0) error(409, 'Este viaje ya no tiene cupos');
      let s = db.solicitudes.find((x) => x.viajeId === v.id && x.pasajeroId === u.id);
      if (s?.estado === 'pendiente') error(409, 'Ya pediste cupo en este viaje; espera la respuesta del conductor');
      if (s?.estado === 'aceptada') error(409, 'Ya tienes un cupo confirmado en este viaje');
      if (s?.estado === 'rechazada') error(409, 'El conductor ya rechazó tu solicitud para este viaje');
      const msj = texto(mensaje, 'mensaje', { max: 200, opcional: true });
      if (s) Object.assign(s, { estado: 'pendiente', mensaje: msj, creadoEn: new Date().toISOString() });
      else {
        s = { id: sigId(db.solicitudes), viajeId: v.id, pasajeroId: u.id, estado: 'pendiente', mensaje: msj, creadoEn: new Date().toISOString() };
        db.solicitudes.push(s);
      }
      avisar(db, v.conductorId, 'solicitud_nueva', `${u.nombre} te pidió un cupo en tu viaje ${ruta(v)}.`, v.id);
      return { solicitud: { id: s.id, estado: s.estado } };
    }),

  misSolicitudes: () =>
    ejecutar((db) => {
      const u = yo(db);
      const solicitudes = db.solicitudes
        .filter((s) => s.pasajeroId === u.id)
        .map((s) => {
          const v = db.viajes.find((x) => x.id === s.viajeId);
          return {
            id: s.id, estado: s.estado, mensaje: s.mensaje, creadoEn: s.creadoEn,
            viaje: { ...vistaViaje(v), conductorNombre: db.usuarios.find((x) => x.id === v.conductorId).nombre },
          };
        })
        .sort((a, b) => a.viaje.fechaHora.localeCompare(b.viaje.fechaHora));
      return { solicitudes };
    }),

  solicitudesRecibidas: () =>
    ejecutar((db) => {
      const u = yo(db);
      const solicitudes = db.solicitudes
        .filter((s) => s.estado === 'pendiente')
        .map((s) => ({ s, v: db.viajes.find((x) => x.id === s.viajeId) }))
        .filter(({ v }) => v.conductorId === u.id && v.estado === 'activo' && new Date(v.fechaHora) > new Date())
        .map(({ s, v }) => {
          const p = db.usuarios.find((x) => x.id === s.pasajeroId);
          return {
            id: s.id, estado: s.estado, mensaje: s.mensaje, creadoEn: s.creadoEn,
            pasajero: { id: p.id, nombre: p.nombre, ...reputacion(db, p.id) },
            viaje: { ...vistaViaje(v) },
          };
        });
      return { solicitudes };
    }),

  aceptarSolicitud: (id) => ejecutar((db) => responder(db, id, true)),
  rechazarSolicitud: (id) => ejecutar((db) => responder(db, id, false)),

  cancelarSolicitud: (id) =>
    ejecutar((db) => {
      const u = yo(db);
      const s = db.solicitudes.find((x) => x.id === Number(id));
      if (!s) error(404, 'La solicitud no existe');
      if (s.pasajeroId !== u.id) error(403, 'Solo puedes cancelar tus propias solicitudes');
      if (!['pendiente', 'aceptada'].includes(s.estado)) error(409, `Esta solicitud ya está ${s.estado}`);
      const v = db.viajes.find((x) => x.id === s.viajeId);
      if (s.estado === 'aceptada') v.cuposDisponibles += 1;
      avisar(db, v.conductorId, 'solicitud_cancelada', `${u.nombre} canceló ${s.estado === 'aceptada' ? 'su cupo' : 'su solicitud'} en tu viaje ${ruta(v)}.`, v.id);
      s.estado = 'cancelada';
      return { solicitud: { id: s.id, estado: s.estado } };
    }),

  calificacionesDelViaje: (viajeId) =>
    ejecutar((db) => {
      const u = yo(db);
      const v = buscarViaje(db, viajeId);
      const gente = participantes(db, v);
      const mio = gente.find((p) => p.id === u.id);
      if (!mio) error(403, 'No participaste en este viaje');
      const personas = gente
        .filter((p) => (mio.papel === 'conductor' ? p.papel === 'pasajero' : p.papel === 'conductor'))
        .map((p) => ({
          id: p.id, nombre: p.nombre, papel: p.papel,
          yaCalificado: db.calificaciones.some((k) => k.viajeId === v.id && k.autorId === u.id && k.calificadoId === p.id),
        }));
      return { viaje: vistaViaje(v), habilitado: calificable(v), personas };
    }),

  calificar: (viajeId, d) =>
    ejecutar((db) => {
      const u = yo(db);
      const v = buscarViaje(db, viajeId);
      const puntaje = Number(d.puntaje);
      if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) error(400, 'El puntaje debe estar entre 1 y 5');
      if (!calificable(v)) error(409, 'Solo puedes calificar cuando el viaje haya terminado');
      const gente = participantes(db, v);
      const mio = gente.find((p) => p.id === u.id);
      if (!mio) error(403, 'Solo los participantes del viaje pueden calificar');
      const objetivo = gente.find((p) => p.id === Number(d.calificadoId) && p.papel !== mio.papel);
      if (!objetivo) error(400, 'Solo puedes calificar a tus compañeros de este viaje');
      if (db.calificaciones.some((k) => k.viajeId === v.id && k.autorId === u.id && k.calificadoId === objetivo.id)) {
        error(409, 'Ya calificaste a esta persona en este viaje');
      }
      const k = { id: sigId(db.calificaciones), viajeId: v.id, autorId: u.id, calificadoId: objetivo.id, puntaje, comentario: d.comentario?.trim() || null, creadoEn: new Date().toISOString() };
      db.calificaciones.push(k);
      avisar(db, objetivo.id, 'calificacion_recibida', `Recibiste una calificación de ${puntaje} ★ por el viaje ${ruta(v)}.`, v.id);
      return { calificacion: { id: k.id, puntaje, comentario: k.comentario } };
    }),

  avisos: () =>
    ejecutar((db) => {
      const u = yo(db);
      const avisos = db.avisos.filter((a) => a.usuarioId === u.id).sort((a, b) => b.id - a.id);
      return { avisos, noLeidos: avisos.filter((a) => !a.leido).length };
    }),
  leerAvisos: () =>
    ejecutar((db) => {
      const u = yo(db);
      db.avisos.filter((a) => a.usuarioId === u.id).forEach((a) => (a.leido = true));
      return { ok: true };
    }),
};

function responder(db, id, aceptar) {
  const u = yo(db);
  const s = db.solicitudes.find((x) => x.id === Number(id));
  if (!s) error(404, 'La solicitud no existe');
  const v = db.viajes.find((x) => x.id === s.viajeId);
  if (v.conductorId !== u.id) error(403, 'Solo el conductor del viaje puede responder esta solicitud');
  if (s.estado !== 'pendiente') error(409, `Esta solicitud ya fue ${s.estado}`);
  if (v.estado !== 'activo') error(409, 'El viaje ya no está activo');
  if (!aceptar) {
    s.estado = 'rechazada';
    avisar(db, s.pasajeroId, 'solicitud_rechazada', `El conductor no pudo aceptar tu solicitud para el viaje ${ruta(v)}.`, v.id);
    return { solicitud: { id: s.id, estado: s.estado, cuposDisponibles: v.cuposDisponibles } };
  }
  if (v.cuposDisponibles <= 0) error(409, 'El viaje ya no tiene cupos disponibles');
  v.cuposDisponibles -= 1;
  s.estado = 'aceptada';
  avisar(db, s.pasajeroId, 'solicitud_aceptada', `¡Tienes cupo! El conductor aceptó tu solicitud para el viaje ${ruta(v)}.`, v.id);
  if (v.cuposDisponibles === 0) {
    db.solicitudes
      .filter((x) => x.viajeId === v.id && x.estado === 'pendiente')
      .forEach((x) => {
        x.estado = 'rechazada';
        avisar(db, x.pasajeroId, 'viaje_lleno', `El viaje ${ruta(v)} se llenó y tu solicitud no pudo ser aceptada.`, v.id);
      });
  }
  return { solicitud: { id: s.id, estado: 'aceptada', cuposDisponibles: v.cuposDisponibles } };
}
