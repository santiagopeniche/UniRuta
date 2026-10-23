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
  console.error('No se pudo iniciar el servidor:', error.message);
  console.error('¿Está corriendo PostgreSQL y es correcta la variable DATABASE_URL del archivo .env?');
  process.exit(1);
});
