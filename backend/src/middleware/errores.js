const { HttpError } = require('../utils/errores');
const config = require('../config');

function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function manejadorErrores(error, req, res, next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, ...(error.detalles && { detalles: error.detalles }) });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  // Errores de PostgreSQL que vienen de restricciones de la base de datos
  if (error.code === '23505') return res.status(409).json({ error: 'Ese registro ya existe' });
  if (error.code === '23514' || error.code === '22P02') {
    return res.status(400).json({ error: 'Algún dato no es válido' });
  }

  if (!config.esPrueba) console.error(error);
  res.status(500).json({ error: 'Ocurrió un error inesperado. Intenta de nuevo.' });
}

module.exports = { rutaNoEncontrada, manejadorErrores };
