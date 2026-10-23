// Estado global de la sesión: quién está conectado y cuántos avisos sin leer tiene.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, sesion } from '../api';

const ContextoSesion = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(sesion.token()));
  const [noLeidos, setNoLeidos] = useState(0);

  const refrescarAvisos = useCallback(async () => {
    if (!sesion.token()) return;
    try {
      const { noLeidos: n } = await api.avisos();
      setNoLeidos(n);
    } catch {
      /* sin conexión: se intenta en la siguiente vuelta */
    }
  }, []);

  useEffect(() => {
    if (!sesion.token()) return;
    api
      .yo()
      .then(({ usuario: u }) => setUsuario(u))
      .catch(() => sesion.cerrar())
      .finally(() => setCargando(false));
  }, []);

  // Revisa los avisos cada 30 segundos mientras haya sesión
  useEffect(() => {
    if (!usuario) return undefined;
    refrescarAvisos();
    const id = setInterval(refrescarAvisos, 30000);
    return () => clearInterval(id);
  }, [usuario, refrescarAvisos]);

  const entrar = (token, u) => {
    sesion.guardar(token);
    setUsuario(u);
  };
  const salir = () => {
    sesion.cerrar();
    setUsuario(null);
    setNoLeidos(0);
  };

  return (
    <ContextoSesion.Provider value={{ usuario, setUsuario, cargando, entrar, salir, noLeidos, setNoLeidos, refrescarAvisos }}>
      {children}
    </ContextoSesion.Provider>
  );
}

export const useSesion = () => useContext(ContextoSesion);
