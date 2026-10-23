const app = require('./app');
const config = require('./config');
const { crearEsquema } = require('./db/init');

async function iniciar() {
  // Crea las tablas si no existen (el esquema usa CREATE TABLE IF NOT EXISTS)
  await crearEsquema();
  app.listen(config.port, () => {
    console.log(`🚗 Uniruta UTB API escuchando en http://localhost:${config.port}`);
    console.log(`   Correos: modo "${config.correo.modo}" · Verificación de correo: ${config.exigirVerificacion ? 'sí' : 'no'}`);
  });
}

iniciar().catch((error) => {
  // Al no poder conectarse, pg lanza un AggregateError sin mensaje; el código (ECONNREFUSED, 28P01...) dice la causa
  const causa = error.message || error.code || error.errors?.[0]?.code || String(error);
  console.error('No se pudo iniciar el servidor:', causa);
  if (error.code === 'ECONNREFUSED' || error.errors?.[0]?.code === 'ECONNREFUSED') {
    console.error('PostgreSQL no está encendido. Enciéndelo y escribe "rs" aquí para reintentar.');
  } else if (error.code === '28P01') {
    console.error('La contraseña de PostgreSQL en DATABASE_URL (archivo .env) no es correcta.');
  } else if (error.code === '3D000') {
    console.error('La base de datos de DATABASE_URL no existe. Créala con: CREATE DATABASE uniruta;');
  } else {
    console.error('¿Está corriendo PostgreSQL y es correcta la variable DATABASE_URL del archivo .env?');
  }
  process.exit(1);
});
