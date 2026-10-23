/** Error con código HTTP. Se lanza desde los servicios y lo traduce el middleware de errores. */
class HttpError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

const solicitudInvalida = (mensaje, detalles) => new HttpError(400, mensaje, detalles);
const noAutenticado = (mensaje = 'Debes iniciar sesión') => new HttpError(401, mensaje);
const prohibido = (mensaje = 'No tienes permiso para hacer esto') => new HttpError(403, mensaje);
const noEncontrado = (mensaje = 'No encontrado') => new HttpError(404, mensaje);
const conflicto = (mensaje) => new HttpError(409, mensaje);

/** Envuelve un controlador async para que sus errores lleguen al middleware de errores. */
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, solicitudInvalida, noAutenticado, prohibido, noEncontrado, conflicto, asincrono };
