const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db/pool');
const { noAutenticado, prohibido } = require('../utils/errores');

/** Exige un token válido en el encabezado Authorization: Bearer <token>. Deja el usuario en req.usuario. */
async function requiereSesion(req, res, next) {
  try {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) throw noAutenticado();

    let datos;
    try {
      datos = jwt.verify(token, config.jwtSecret);
    } catch {
      throw noAutenticado('Tu sesión expiró. Inicia sesión de nuevo.');
    }

    const { rows } = await query(
      'SELECT id, nombre, correo, telefono, rol, placa, vehiculo, verificado FROM usuario WHERE id = $1',
      [datos.sub]
    );
    if (!rows[0]) throw noAutenticado('La cuenta ya no existe');
    req.usuario = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

/** Solo deja pasar a usuarios con rol de conductor. Se usa después de requiereSesion. */
function requiereConductor(req, res, next) {
  if (req.usuario.rol !== 'conductor') {
    return next(prohibido('Para publicar viajes debes activar el modo conductor y registrar tu placa en tu perfil'));
  }
  next();
}

const firmarToken = (usuario) => jwt.sign({ sub: usuario.id }, config.jwtSecret, { expiresIn: config.jwtExpiracion });

module.exports = { requiereSesion, requiereConductor, firmarToken };
