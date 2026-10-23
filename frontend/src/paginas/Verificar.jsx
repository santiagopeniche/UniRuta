import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useSesion } from '../contexto/Sesion';
import MarcoAcceso from '../componentes/MarcoAcceso';
import { Cargando, MensajeError } from '../componentes/Basicos';

/** Página a la que lleva el enlace del correo de confirmación. */
export default function Verificar() {
  const [parametros] = useSearchParams();
  const { entrar } = useSesion();
  const navegar = useNavigate();
  const [error, setError] = useState('');
  const yaIntentado = useRef(false);

  useEffect(() => {
    if (yaIntentado.current) return; // evita doble petición en modo estricto de React
    yaIntentado.current = true;
    api
      .verificar(parametros.get('token'))
      .then(({ token, usuario }) => {
        entrar(token, usuario);
        navegar('/perfil?bienvenida=1', { replace: true });
      })
      .catch((e) => setError(e.message));
  }, [parametros, entrar, navegar]);

  return (
    <MarcoAcceso titulo={error ? 'No pudimos confirmar tu cuenta' : 'Confirmando tu cuenta'}>
      {error ? (
        <>
          <MensajeError>{error}</MensajeError>
          <p className="mt-4 text-gris">Si ya la habías confirmado, simplemente inicia sesión.</p>
          <Link to="/entrar" className="boton-principal mt-4 w-full">Ir a entrar</Link>
        </>
      ) : (
        <Cargando texto="Un momento" />
      )}
    </MarcoAcceso>
  );
}
