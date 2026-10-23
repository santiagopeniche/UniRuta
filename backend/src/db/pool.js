const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

/** Ejecuta una consulta parametrizada. Nunca concatenar valores del usuario en el SQL. */
const query = (texto, parametros) => pool.query(texto, parametros);

/**
 * Ejecuta `trabajo(cliente)` dentro de una transacción.
 * Si algo falla se hace ROLLBACK y el error se propaga.
 */
async function transaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

module.exports = { pool, query, transaccion };
