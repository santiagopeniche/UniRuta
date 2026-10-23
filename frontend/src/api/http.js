// Cliente de la API real (backend Express). Todas las pantallas usan estas funciones.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const CLAVE_TOKEN = 'uniruta_token';

// El token se guarda en el navegador; si el almacenamiento está bloqueado (modo privado
// estricto), se guarda en memoria y la sesión dura hasta recargar la página.
let tokenEnMemoria = null;
export const sesion = {
  token: () => {
    try {
      return localStorage.getItem(CLAVE_TOKEN) ?? tokenEnMemoria;
    } catch {
      return tokenEnMemoria;
    }
  },
  guardar: (token) => {
    tokenEnMemoria = token;
    try {
      localStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      /* sin almacenamiento */
    }
  },
  cerrar: () => {
    tokenEnMemoria = null;
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* sin almacenamiento */
    }
  },
};

export class ErrorApi extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

async function pedir(metodo, ruta, cuerpo) {
  const headers = { 'Content-Type': 'application/json' };
  const token = sesion.token();
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(BASE + ruta, { method: metodo, headers, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) sesion.cerrar();
    throw new ErrorApi(respuesta.status, datos.error || 'Algo salió mal. Intenta de nuevo.');
  }
  return datos;
}

const consulta = (filtros) => {
  const p = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // usuarios y acceso
  registro: (datos) => pedir('POST', '/auth/registro', datos),
  verificar: (token) => pedir('POST', '/auth/verificar', { token }),
  reenviarVerificacion: (correo) => pedir('POST', '/auth/reenviar-verificacion', { correo }),
  login: (correo, contrasena) => pedir('POST', '/auth/login', { correo, contrasena }),
  yo: () => pedir('GET', '/usuarios/me'),
  actualizarPerfil: (datos) => pedir('PATCH', '/usuarios/me', datos),
  perfilPublico: (id) => pedir('GET', `/usuarios/${id}`),

  // viajes
  buscarViajes: (filtros = {}) => pedir('GET', `/viajes${consulta(filtros)}`),
  publicarViaje: (datos) => pedir('POST', '/viajes', datos),
  viaje: (id) => pedir('GET', `/viajes/${id}`),
  misViajes: () => pedir('GET', '/viajes/mios'),
  historial: () => pedir('GET', '/viajes/historial'),
  finalizarViaje: (id) => pedir('POST', `/viajes/${id}/finalizar`),
  cancelarViaje: (id) => pedir('POST', `/viajes/${id}/cancelar`),

  // solicitudes
  pedirCupo: (viajeId, mensaje) => pedir('POST', `/viajes/${viajeId}/solicitudes`, { mensaje }),
  misSolicitudes: () => pedir('GET', '/solicitudes/mias'),
  solicitudesRecibidas: () => pedir('GET', '/solicitudes/recibidas'),
  aceptarSolicitud: (id) => pedir('POST', `/solicitudes/${id}/aceptar`),
  rechazarSolicitud: (id) => pedir('POST', `/solicitudes/${id}/rechazar`),
  cancelarSolicitud: (id) => pedir('POST', `/solicitudes/${id}/cancelar`),

  // calificaciones
  calificacionesDelViaje: (viajeId) => pedir('GET', `/viajes/${viajeId}/calificaciones`),
  calificar: (viajeId, datos) => pedir('POST', `/viajes/${viajeId}/calificaciones`, datos),

  // avisos
  avisos: () => pedir('GET', '/avisos'),
  leerAvisos: () => pedir('POST', '/avisos/leer'),
};
