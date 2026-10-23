// Dos campos (origen y destino) unidos por la línea de ruta, con botón para invertirlos.
import { ArrowDownUp } from 'lucide-react';
import { LUGARES_SUGERIDOS } from '../utils/formato';

export default function CamposRuta({ origen, destino, onCambio, requerido = false, ayudaOrigen = 'Desde', ayudaDestino = 'Hasta' }) {
  return (
    <div className="relative grid grid-cols-[1.25rem_1fr] gap-x-3">
      <datalist id="lugares">
        {LUGARES_SUGERIDOS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      <div className="flex flex-col items-center pb-[1.6rem] pt-[2.55rem]" aria-hidden="true">
        <span className="size-4 shrink-0 rounded-full border-[3px] border-tinta bg-white" />
        <span className="my-1 w-[5px] flex-1 rounded-full bg-muralla" />
        <span className="size-4 shrink-0 rounded-full bg-tinta" />
      </div>

      <div className="space-y-3 pr-12">
        <div>
          <label htmlFor="origen" className="etiqueta">{ayudaOrigen}</label>
          <input id="origen" list="lugares" className="campo" placeholder="Barrio o municipio" autoComplete="off"
            required={requerido} value={origen} onChange={(e) => onCambio({ origen: e.target.value, destino })} />
        </div>
        <div>
          <label htmlFor="destino" className="etiqueta">{ayudaDestino}</label>
          <input id="destino" list="lugares" className="campo" placeholder="Barrio, municipio o campus" autoComplete="off"
            required={requerido} value={destino} onChange={(e) => onCambio({ origen, destino: e.target.value })} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onCambio({ origen: destino, destino: origen })}
        className="absolute right-0 top-[4.6rem] inline-flex size-10 items-center justify-center rounded-full border border-linea bg-white text-tinta hover:border-tinta/40"
        aria-label="Invertir origen y destino"
        title="Invertir origen y destino"
      >
        <ArrowDownUp className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
