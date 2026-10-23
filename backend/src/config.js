require('dotenv').config();

const bool = (valor, porDefecto) =>
  valor === undefined || valor === '' ? porDefecto : ['true', '1', 'si', 'sí'].includes(String(valor).toLowerCase());

const esPrueba = process.env.NODE_ENV === 'test';

const config = {
  esPrueba,
  esProduccion: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 4000,
  databaseUrl: esPrueba
    ? process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/uniruta_test'
    : process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/uniruta',
  databaseSsl: bool(process.env.DATABASE_SSL, false),
  jwtSecret: process.env.JWT_SECRET || (esPrueba ? 'clave-de-pruebas' : ''),
  jwtExpiracion: '7d',
  dominioCorreo: (process.env.ALLOWED_EMAIL_DOMAIN || 'utb.edu.co').toLowerCase(),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  exigirVerificacion: bool(process.env.REQUIRE_EMAIL_VERIFICATION, true),
  zonaHoraria: 'America/Bogota',
  correo: {
    modo: esPrueba ? 'memoria' : process.env.EMAIL_MODE || 'console',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: bool(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'Uniruta UTB <no-responder@uniruta.app>',
    enviarAvisos: bool(process.env.EMAIL_AVISOS, false),
  },
};

if (!config.jwtSecret) {
  throw new Error('Falta la variable de entorno JWT_SECRET. Revisa el archivo .env (ver .env.example).');
}

module.exports = config;
