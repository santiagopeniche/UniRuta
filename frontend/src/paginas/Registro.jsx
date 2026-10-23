import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { api, MODO_DEMO } from '../api';
import MarcoAcceso from '../componentes/MarcoAcceso';
import { MensajeError } from '../componentes/Basicos';

const DOMINIO = 'utb.edu.co';

export default function Registro() {
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ nombre: '', correo: '', telefono: '', contrasena: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(null);

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const correoEscrito = datos.correo.trim().toLowerCase();
  const correoAjeno = correoEscrito.includes('@') && !correoEscrito.endsWith(`@${DOMINIO}`);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (correoAjeno) return setError(`Solo puedes registrarte con tu correo institucional @${DOMINIO}`);
    setEnviando(true);
    try {
      const r = await api.registro(datos);
      if (!r.requiereVerificacion) return navegar('/entrar');
      setListo(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <MarcoAcceso titulo="Revisa tu correo">
        <div className="panel p-5">
          <MailCheck className="size-8 text-mar" aria-hidden="true" />
          <p className="mt-3">
            Enviamos un enlace de confirmación a <strong>{correoEscrito}</strong>. Ábrelo para activar tu cuenta y luego inicia sesión.
          </p>
          <p className="mt-2 text-sm text-gris">Si no lo ves en unos minutos, revisa la carpeta de correo no deseado.</p>
        </div>
        {MODO_DEMO && (
          <Link to={`/verificar?token=${api.ultimoTokenVerificacion()}`} className="boton-principal mt-4 w-full">
            Abrir el enlace del correo (demo)
          </Link>
        )}
        <Link to="/entrar" className="boton-secundario mt-3 w-full">Ir a entrar</Link>
      </MarcoAcceso>
    );
  }

  return (
    <MarcoAcceso titulo="Crear cuenta" subtitulo="Solo para la comunidad UTB. Te pediremos confirmar tu correo institucional.">
      <form className="space-y-4" onSubmit={enviar} noValidate>
        <div>
          <label htmlFor="nombre" className="etiqueta">Nombre completo</label>
          <input id="nombre" autoComplete="name" required minLength={3} className="campo" value={datos.nombre} onChange={cambiar('nombre')} />
        </div>
        <div>
          <label htmlFor="correo" className="etiqueta">Correo institucional</label>
          <input
            id="correo"
            type="email"
            autoComplete="email"
            required
            className="campo"
            placeholder={`tu.nombre@${DOMINIO}`}
            aria-describedby="ayuda-correo"
            aria-invalid={correoAjeno}
            value={datos.correo}
            onChange={cambiar('correo')}
          />
          <p id="ayuda-correo" className={`mt-1.5 text-sm ${correoAjeno ? 'font-bold text-alerta' : 'text-gris'}`}>
            {correoAjeno ? `Debe terminar en @${DOMINIO}` : 'Así sabemos que eres de la UTB.'}
          </p>
        </div>
        <div>
          <label htmlFor="telefono" className="etiqueta">Celular <span className="font-normal text-gris">(opcional)</span></label>
          <input id="telefono" type="tel" autoComplete="tel" inputMode="tel" className="campo" placeholder="300 123 4567"
            aria-describedby="ayuda-tel" value={datos.telefono} onChange={cambiar('telefono')} />
          <p id="ayuda-tel" className="mt-1.5 text-sm text-gris">Solo lo ve quien comparta un viaje confirmado contigo.</p>
        </div>
        <div>
          <label htmlFor="contrasena" className="etiqueta">Contraseña</label>
          <input id="contrasena" type="password" autoComplete="new-password" required minLength={8} className="campo"
            aria-describedby="ayuda-clave" value={datos.contrasena} onChange={cambiar('contrasena')} />
          <p id="ayuda-clave" className="mt-1.5 text-sm text-gris">Mínimo 8 caracteres.</p>
        </div>

        <MensajeError>{error}</MensajeError>
        <button type="submit" disabled={enviando} className="boton-principal w-full">
          {enviando ? 'Creando cuenta' : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-6 text-center text-gris">
        ¿Ya tienes cuenta?{' '}
        <Link to="/entrar" className="font-bold text-mar underline underline-offset-4">Entra</Link>
      </p>
    </MarcoAcceso>
  );
}
