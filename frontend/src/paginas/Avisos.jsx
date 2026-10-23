// Avisos dentro de la app: solicitudes, respuestas, cancelaciones y calificaciones.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, CheckCircle2, XCircle, Ban, Star, Flag } from 'lucide-react';
import { api } from '../api';
import { useSesion } from '../contexto/Sesion';
import { Cargando, MensajeError, Titulo, Vacio } from '../componentes/Basicos';
import { haceCuanto } from '../utils/formato';

const ICONOS = {
  solicitud_nueva: [Inbox, 'text-mar'],
  solicitud_aceptada: [CheckCircle2, 'text-exito'],
  solicitud_rechazada: [XCircle, 'text-alerta'],
  viaje_lleno: [XCircle, 'text-alerta'],
  solicitud_cancelada: [Ban, 'text-gris'],
  viaje_cancelado: [Ban, 'text-alerta'],
  viaje_finalizado: [Flag, 'text-mar'],
  calificacion_recibida: [Star, 'text-muralla'],
};

/** A dónde lleva cada aviso al tocarlo. */
const destino = (a) => (a.tipo === 'solicitud_nueva' ? '/solicitudes' : a.tipo === 'calificacion_recibida' ? '/perfil' : a.viajeId ? `/viajes/${a.viajeId}` : '/');

export default function Avisos() {
  const { setNoLeidos } = useSesion();
  const [avisos, setAvisos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .avisos()
      .then(({ avisos: lista }) => {
        setAvisos(lista);
        if (lista.some((a) => !a.leido)) api.leerAvisos().then(() => setNoLeidos(0));
      })
      .catch((e) => {
        setError(e.message);
        setAvisos([]);
      });
  }, [setNoLeidos]);

  if (avisos === null) return <Cargando />;

  return (
    <>
      <Titulo>Avisos</Titulo>
      <MensajeError>{error}</MensajeError>
      {avisos.length === 0 ? (
        <Vacio titulo="No tienes avisos" texto="Aquí te contamos cuando alguien pida cupo, cuando te respondan o cuando te califiquen." />
      ) : (
        <ul className="panel divide-y divide-linea">
          {avisos.map((a) => {
            const [Icono, color] = ICONOS[a.tipo] || [Inbox, 'text-gris'];
            return (
              <li key={a.id}>
                <Link to={destino(a)} className={`flex gap-3 px-4 py-4 hover:bg-fondo md:px-5 ${a.leido ? '' : 'bg-mar-claro/60'}`}>
                  <Icono className={`mt-0.5 size-5 shrink-0 ${color}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={`block ${a.leido ? '' : 'font-bold'}`}>{a.mensaje}</span>
                    <span className="mt-0.5 block text-sm text-gris">
                      {haceCuanto(a.creadoEn)}
                      {!a.leido && <span className="sr-only">, nuevo</span>}
                    </span>
                  </span>
                  {!a.leido && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-mar" aria-hidden="true" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
