// Solicitudes recibidas en todos los viajes del conductor (HU-05).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FilaSolicitud from '../componentes/FilaSolicitud';
import { Cargando, MensajeError, Titulo, Vacio } from '../componentes/Basicos';
import { fechaCorta, horaLegible } from '../utils/formato';

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api
      .solicitudesRecibidas()
      .then(({ solicitudes: s }) => setSolicitudes(s))
      .catch((e) => {
        setError(e.message);
        setSolicitudes([]);
      });
  }, []);
  useEffect(cargar, [cargar]);

  if (solicitudes === null) return <Cargando />;

  // agrupa por viaje para que el conductor vea cuántos cupos le quedan en cada uno
  const porViaje = solicitudes.reduce((grupos, s) => {
    (grupos[s.viaje.id] ||= { viaje: s.viaje, lista: [] }).lista.push(s);
    return grupos;
  }, {});

  return (
    <>
      <Titulo detalle="Decide quién viaja contigo. Cada pasajero recibe un aviso con tu respuesta.">Solicitudes de cupo</Titulo>
      <MensajeError>{error}</MensajeError>
      {solicitudes.length === 0 ? (
        <Vacio titulo="No tienes solicitudes por responder" texto="Cuando alguien pida cupo en uno de tus viajes, aparecerá aquí." accion="Ver mis viajes" a="/mis-viajes?ver=publicados" />
      ) : (
        <div className="space-y-4">
          {Object.values(porViaje).map(({ viaje, lista }) => (
            <section key={viaje.id} className="panel px-4 pt-4 md:px-6">
              <Link to={`/viajes/${viaje.id}`} className="block underline-offset-4 hover:underline">
                <h2 className="text-lg font-bold">
                  {viaje.origen} a {viaje.destino}
                </h2>
              </Link>
              <p className="text-gris">
                {fechaCorta(viaje.fecha)}, {horaLegible(viaje.hora)}
                <span className={`block ${viaje.cuposDisponibles === 0 ? 'font-bold text-alerta' : ''}`}>
                  {viaje.cuposDisponibles === 0
                    ? 'Sin cupos libres'
                    : viaje.cuposDisponibles === 1
                      ? 'Te queda 1 cupo'
                      : `Te quedan ${viaje.cuposDisponibles} cupos`}
                </span>
              </p>
              <div className="divide-y divide-linea">
                {lista.map((s) => (
                  <FilaSolicitud key={s.id} solicitud={s} alResponder={cargar} sinCupos={viaje.cuposDisponibles === 0} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
