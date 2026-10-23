// Crea las tablas de la base de datos. Uso: npm run db:init
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function crearEsquema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = { crearEsquema };

if (require.main === module) {
  crearEsquema()
    .then(() => console.log('✔ Tablas creadas (usuario, viaje, solicitud, calificacion, aviso).'))
    .catch((e) => {
      console.error('✘ No se pudo crear el esquema:', e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
