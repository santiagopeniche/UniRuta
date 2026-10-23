import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, MODO_DEMO } from '../api';
import { CUENTAS_DEMO, CONTRASENA_DEMO } from '../api/demo';
import { useSesion } from '../contexto/Sesion';
import MarcoAcceso from '../componentes/MarcoAcceso';
import { MensajeError } from '../componentes/Basicos';

export default function Entrar() {
  const { entrar } = useSesion();
  const navegar = useNavigate();
  const { state } = useLocation();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [sinConfirmar, setSinConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  async function iniciar(c = correo, p = contrasena) {
    setError('');
    setSinConfirmar(false);
    setEnviando(true);
    try {
      const { token, usuario } = await api.login(c, p);
      entrar(token, usuario);
      navegar(state?.desde || '/', { replace: true });
    } catch (e) {
      setError(e.message);
      setSinConfirmar(e.status === 403);
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    await api.reenviarVerificacion(correo).catch(() => {});
    setReenviado(true);
  }

  return (
    <MarcoAcceso titulo="Entrar" subtitulo="Usa tu correo de la UTB.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar();
        }}
      >
        <div>
          <label htmlFor="correo" className="etiqueta">Correo institucional</label>
          <input id="correo" type="email" autoComplete="email" required className="campo" placeholder="tu.nombre@utb.edu.co"
            value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <div>
          <label htmlFor="contrasena" className="etiqueta">Contraseña</label>
          <input id="contrasena" type="password" autoComplete="current-password" required className="campo"
            value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
        </div>

        <MensajeError>{error}</MensajeError>
        {sinConfirmar && (
          <button type="button" onClick={reenviar} disabled={reenviado} className="text-sm font-bold text-mar underline underline-offset-4">
            {reenviado ? 'Te enviamos un nuevo correo de confirmación' : 'Reenviar el correo de confirmación'}
          </button>
        )}

        <button type="submit" disabled={enviando} className="boton-principal w-full">
          {enviando ? 'Entrando' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-center text-gris">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-bold text-mar underline underline-offset-4">Regístrate</Link>
      </p>

      {MODO_DEMO && (
        <section className="mt-8 border-t border-linea pt-6">
          <h2 className="font-bold">Probar con una cuenta de ejemplo</h2>
          <ul className="mt-3 space-y-2">
            {CUENTAS_DEMO.map((c) => (
              <li key={c.correo}>
                <button
                  type="button"
                  onClick={() => iniciar(c.correo, CONTRASENA_DEMO)}
                  className="panel w-full px-4 py-3 text-left hover:border-tinta/40"
                >
                  <span className="block font-bold">{c.nombre}</span>
                  <span className="block text-sm text-gris">{c.descripcion}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </MarcoAcceso>
  );
}
