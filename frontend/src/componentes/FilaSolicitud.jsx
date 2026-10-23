// Una solicitud de cupo vista por el conductor, con los botones para responder (RF-06, HU-05).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { api } from '../api';
import { useAviso } from '../contexto/Aviso';
import { Reputacion } from './Estrellas';
import Estado from './Estado';
import { Avatar } from './Basicos';

export default function FilaSolicitud({ solicitud, alResponder, sinCupos = false }) {
  const avisar = useAviso();
  const [ocupado, setOcupado] = useState(null);
  const p = solicitud.pasajero;

  async function responder(aceptar) {
    setOcupado(aceptar ? 'aceptar' : 'rechazar');
    try {
      await (aceptar ? api.aceptarSolicitud(solicitud.id) : api.rechazarSolicitud(solicitud.id));
      avisar(aceptar ? `Aceptaste a ${p.nombre.split(' ')[0]}` : `Rechazaste la solicitud de ${p.nombre.split(' ')[0]}`);
      alResponder?.();
    } catch (e) {
      avisar(e.message, 'error');
      alResponder?.();
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar nombre={p.nombre} />
        <div className="min-w-0">
          <Link to={`/usuarios/${p.id}`} className="font-bold underline-offset-4 hover:underline">{p.nombre}</Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Reputacion promedio={p.promedio} total={p.totalCalificaciones} />
            {['rechazada', 'cancelada'].includes(solicitud.estado) && <Estado estado={solicitud.estado} />}
          </div>
          {solicitud.mensaje && <p className="mt-1.5 text-gris">“{solicitud.mensaje}”</p>}
          {p.telefono && (
            <a href={`tel:${p.telefono.replace(/\s/g, '')}`} className="mt-1.5 inline-flex items-center gap-1.5 font-bold text-mar">
              <Phone className="size-4" aria-hidden="true" />
              {p.telefono}
            </a>
          )}
        </div>
      </div>

      {solicitud.estado === 'pendiente' && (
        <div className="flex shrink-0 gap-2">
          <button type="button" className="boton-secundario flex-1 sm:flex-none" disabled={Boolean(ocupado)} onClick={() => responder(false)}>
            {ocupado === 'rechazar' ? 'Rechazando' : 'Rechazar'}
          </button>
          <button type="button" className="boton-principal flex-1 sm:flex-none" disabled={Boolean(ocupado) || sinCupos} onClick={() => responder(true)}>
            {ocupado === 'aceptar' ? 'Aceptando' : 'Aceptar'}
          </button>
        </div>
      )}
    </div>
  );
}
