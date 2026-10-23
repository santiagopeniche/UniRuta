import { Link } from 'react-router-dom';
import Ruta from './Ruta';
import { Reputacion } from './Estrellas';
import Estado from './Estado';
import { fechaCorta, horaLegible, dinero, cupos } from '../utils/formato';

/**
 * Un viaje en una lista. La hora va a la izquierda en grande porque es
 * lo primero que decide si a un estudiante le sirve o no.
 */
export default function TarjetaViaje({ viaje, mostrarConductor = true, pie, estado }) {
  const sinCupos = viaje.cuposDisponibles === 0;
  return (
    <Link
      to={`/viajes/${viaje.id}`}
      className="panel group grid grid-cols-[4.75rem_1fr] gap-x-4 p-4 transition-colors hover:border-tinta/40 sm:grid-cols-[6rem_1fr]"
    >
      <div className="border-r border-linea pr-3">
        <p className="font-display text-xl font-extrabold leading-none sm:text-2xl" style={{ fontStretch: '87.5%' }}>
          {horaLegible(viaje.hora).replace(/ [ap]\. m\./, '')}
        </p>
        <p className="mt-0.5 text-sm text-gris">{horaLegible(viaje.hora).slice(-5)}</p>
        <p className="mt-2 text-sm font-bold">{fechaCorta(viaje.fecha)}</p>
      </div>

      <div className="min-w-0">
        <Ruta origen={viaje.origen} destino={viaje.destino} tachada={viaje.estado === 'cancelado'} />

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {estado ? (
            <Estado estado={estado} />
          ) : (
            viaje.cuposDisponibles !== undefined && (
              <span className={`font-bold ${sinCupos ? 'text-alerta' : 'text-exito'}`}>
                {sinCupos ? 'Sin cupos' : `${cupos(viaje.cuposDisponibles)} libre${viaje.cuposDisponibles === 1 ? '' : 's'}`}
              </span>
            )
          )}
          {viaje.aporteSugerido != null && <span className="text-gris">Aporte sugerido {dinero(viaje.aporteSugerido)}</span>}
        </div>

        {mostrarConductor && viaje.conductor && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-linea pt-3 text-sm">
            <span className="font-bold">{viaje.conductor.nombre}</span>
            <Reputacion promedio={viaje.conductor.promedio} total={viaje.conductor.totalCalificaciones} />
            {viaje.miSolicitud && <Estado estado={viaje.miSolicitud} />}
          </div>
        )}
        {pie}
      </div>
    </Link>
  );
}
