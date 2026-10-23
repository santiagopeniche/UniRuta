// Botón para acciones que no se pueden deshacer: pide una segunda confirmación en línea.
import { useState } from 'react';

export default function BotonConfirmar({ texto, pregunta, confirmar, onConfirmar, estilo = 'boton-peligro', className = '' }) {
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  if (!abierto) {
    return (
      <button type="button" className={`${estilo} ${className}`} onClick={() => setAbierto(true)}>
        {texto}
      </button>
    );
  }
  return (
    <div className={`rounded-[10px] border border-linea bg-white p-4 ${className}`} role="group" aria-label={pregunta}>
      <p className="font-bold">{pregunta}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ocupado}
          className={estilo}
          onClick={async () => {
            setOcupado(true);
            try {
              await onConfirmar();
            } finally {
              setOcupado(false);
              setAbierto(false);
            }
          }}
        >
          {confirmar}
        </button>
        <button type="button" className="boton-secundario" onClick={() => setAbierto(false)}>
          No, volver
        </button>
      </div>
    </div>
  );
}
