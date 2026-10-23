// Mis viajes: cupos pedidos (pasajero), viajes publicados (conductor) e historial.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useSesion } from '../contexto/Sesion';
import TarjetaViaje from '../componentes/TarjetaViaje';
import { Cargando, MensajeError, Titulo, Vacio } from '../componentes/Basicos';

const PESTANAS = [
  { id: 'cupos', texto: 'Mis cupos' },
  { id: 'publicados', texto: 'Publicados' },
  { id: 'historial', texto: 'Historial' },
];

function Lista({ cargar, vacio, render }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    cargar()
      .then(setItems)
      .catch((e) => {
        setError(e.message);
        setItems([]);
      });
  }, [cargar]);

  if (items === null) return <Cargando />;
  return (
    <>
      <MensajeError>{error}</MensajeError>
      {items.length === 0 ? vacio : <ul className="space-y-3">{items.map(render)}</ul>}
    </>
  );
}

const cargarCupos = () =>
  api.misSolicitudes().then(({ solicitudes }) =>
    solicitudes.filter((s) => s.viaje.estado === 'activo' && s.estado !== 'cancelada' && new Date(`${s.viaje.fecha}T${s.viaje.hora}:00-05:00`) > new Date())
  );
const cargarPublicados = () => api.misViajes().then(({ viajes }) => viajes);
const cargarHistorial = () => api.historial().then(({ viajes }) => viajes);

export default function MisViajes() {
  const { usuario } = useSesion();
  const [parametros, setParametros] = useSearchParams();
  const porDefecto = usuario.rol === 'conductor' ? 'publicados' : 'cupos';
  const pestana = parametros.get('ver') || porDefecto;

  return (
    <>
      <Titulo>Mis viajes</Titulo>

      <div role="tablist" aria-label="Tipo de viajes" className="mb-5 flex gap-1 rounded-xl border border-linea bg-white p-1">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            type="button"
            aria-selected={pestana === p.id}
            onClick={() => setParametros({ ver: p.id }, { replace: true })}
            className={`flex-1 rounded-lg px-3 py-2.5 font-bold transition-colors ${pestana === p.id ? 'bg-tinta text-white' : 'text-gris hover:text-tinta'}`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {pestana === 'cupos' && (
          <Lista
            cargar={cargarCupos}
            vacio={<Vacio titulo="No tienes cupos pedidos" texto="Busca un viaje que vaya para tu lado y pide un cupo." accion="Buscar viajes" a="/" />}
            render={(s) => (
              <li key={s.id}>
                <TarjetaViaje viaje={s.viaje} mostrarConductor={false} estado={s.estado}
                  pie={<p className="mt-2 text-sm text-gris">Conductor: {s.viaje.conductorNombre}</p>} />
              </li>
            )}
          />
        )}

        {pestana === 'publicados' && (
          <Lista
            cargar={cargarPublicados}
            vacio={
              <Vacio
                titulo="No has publicado viajes"
                texto={usuario.rol === 'conductor' ? 'Publica tu próximo trayecto y comparte los puestos libres.' : 'Si tienes carro, activa el modo conductor en tu perfil.'}
                accion={usuario.rol === 'conductor' ? 'Publicar un viaje' : 'Ir a mi perfil'}
                a={usuario.rol === 'conductor' ? '/publicar' : '/perfil'}
              />
            }
            render={(v) => (
              <li key={v.id}>
                <TarjetaViaje
                  viaje={v}
                  mostrarConductor={false}
                  estado={v.estado !== 'activo' ? v.estado : undefined}
                  pie={
                    v.estado === 'activo' && (
                      <p className="mt-2 text-sm">
                        {v.solicitudesPendientes > 0 && (
                          <strong className="mr-3 text-mar">
                            {v.solicitudesPendientes} {v.solicitudesPendientes === 1 ? 'solicitud' : 'solicitudes'} por responder
                          </strong>
                        )}
                        <span className="text-gris">
                          {v.pasajerosAceptados} {v.pasajerosAceptados === 1 ? 'pasajero confirmado' : 'pasajeros confirmados'}
                        </span>
                      </p>
                    )
                  }
                />
              </li>
            )}
          />
        )}

        {pestana === 'historial' && (
          <Lista
            cargar={cargarHistorial}
            vacio={<Vacio titulo="Aún no tienes viajes terminados" texto="Aquí quedarán tus viajes pasados para que puedas calificar a tus compañeros." />}
            render={(v) => (
              <li key={v.id}>
                <TarjetaViaje
                  viaje={v}
                  mostrarConductor={false}
                  estado={v.estado}
                  pie={
                    <p className="mt-2 text-sm">
                      <span className="text-gris">{v.miPapel === 'conductor' ? 'Fuiste el conductor' : `Fuiste pasajero con ${v.conductorNombre}`}</span>
                      {v.porCalificar > 0 && <strong className="ml-3 text-mar">Falta tu calificación</strong>}
                    </p>
                  }
                />
              </li>
            )}
          />
        )}
      </div>
    </>
  );
}
