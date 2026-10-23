// Mensaje flotante breve que confirma una acción ("Viaje publicado", "Cupo pedido").
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ContextoAviso = createContext(() => {});

export function ProveedorAviso({ children }) {
  const [mensaje, setMensaje] = useState(null);
  const temporizador = useRef();

  const mostrar = useCallback((texto, tipo = 'ok') => {
    clearTimeout(temporizador.current);
    setMensaje({ texto, tipo, clave: Date.now() });
    temporizador.current = setTimeout(() => setMensaje(null), 3500);
  }, []);

  return (
    <ContextoAviso.Provider value={mostrar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
        {mensaje && (
          <p
            key={mensaje.clave}
            className={`animar-aviso pointer-events-auto max-w-md rounded-[10px] px-4 py-3 text-sm font-bold text-white ${
              mensaje.tipo === 'error' ? 'bg-alerta' : 'bg-tinta'
            }`}
          >
            {mensaje.texto}
          </p>
        )}
      </div>
    </ContextoAviso.Provider>
  );
}

export const useAviso = () => useContext(ContextoAviso);
