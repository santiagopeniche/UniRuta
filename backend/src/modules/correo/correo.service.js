// Envío de correos. En desarrollo los imprime en la terminal; en producción usa SMTP.
const nodemailer = require('nodemailer');
const config = require('../../config');

let transporte = null;
const bandejaDePruebas = []; // en NODE_ENV=test los correos se guardan aquí para revisarlos

function obtenerTransporte() {
  if (!transporte) {
    transporte = nodemailer.createTransport({
      host: config.correo.host,
      port: config.correo.port,
      secure: config.correo.secure,
      auth: { user: config.correo.user, pass: config.correo.pass },
    });
  }
  return transporte;
}

async function enviarCorreo({ para, asunto, texto }) {
  const { modo, from } = config.correo;

  if (modo === 'memoria') {
    bandejaDePruebas.push({ para, asunto, texto });
    return;
  }
  if (modo === 'console') {
    console.log(`\n📧 Correo para ${para}\n   Asunto: ${asunto}\n   ${texto.replace(/\n/g, '\n   ')}\n`);
    return;
  }
  try {
    await obtenerTransporte().sendMail({ from, to: para, subject: asunto, text: texto });
  } catch (error) {
    // Un fallo del correo no debe tumbar la operación principal; se registra para revisarlo.
    console.error(`No se pudo enviar el correo a ${para}:`, error.message);
  }
}

module.exports = { enviarCorreo, bandejaDePruebas };
