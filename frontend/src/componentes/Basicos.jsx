// Piezas pequeñas reutilizadas en varias pantallas.
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { iniciales } from '../utils/formato';

export function Cargando({ texto = 'Cargando' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-gris" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function MensajeError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-alerta/25 bg-alerta-claro px-4 py-3 text-sm font-bold text-alerta">
      {children}
    </p>
  );
}

/** Pantalla vacía: siempre dice qué hacer a continuación. */
export function Vacio({ titulo, texto, accion, a }) {
  return (
    <div className="panel px-6 py-10 text-center">
      <h3 className="text-lg font-bold">{titulo}</h3>
      {texto && <p className="mx-auto mt-1 max-w-sm text-gris">{texto}</p>}
      {accion && (
        <Link to={a} className="boton-principal mt-5">
          {accion}
        </Link>
      )}
    </div>
  );
}

export function Avatar({ nombre, grande = false }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-tinta font-display font-bold text-white ${
        grande ? 'size-16 text-xl' : 'size-10 text-sm'
      }`}
    >
      {iniciales(nombre)}
    </span>
  );
}

export function Titulo({ children, detalle }) {
  return (
    <header className="mb-5">
      <h1 className="text-[1.75rem] font-extrabold md:text-[2rem]">{children}</h1>
      {detalle && <p className="mt-1 text-gris">{detalle}</p>}
    </header>
  );
}
