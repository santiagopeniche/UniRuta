// Perfil que ven los demás: reputación y comentarios, sin datos de contacto.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Star } from 'lucide-react';
import { api } from '../api';
import { Avatar, Cargando, MensajeError } from '../componentes/Basicos';
import { Reputacion } from '../componentes/Estrellas';
import { haceCuanto } from '../utils/formato';

export default function PerfilPublico() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [u, setU] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.perfilPublico(id).then(({ usuario }) => setU(usuario)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <MensajeError>{error}</MensajeError>;
  if (!u) return <Cargando />;

  const desde = new Date(u.creadoEn).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => navegar(-1)} className="-ml-1 inline-flex items-center gap-1 font-bold text-gris hover:text-tinta">
        <ChevronLeft className="size-5" aria-hidden="true" />
        Volver
      </button>

      <header className="flex items-center gap-4">
        <Avatar nombre={u.nombre} grande />
        <div>
          <h1 className="text-[1.75rem] font-extrabold">{u.nombre}</h1>
          <p className="text-gris">
            {u.rol === 'conductor' ? 'Conductor' : 'Pasajero'} en Uniruta desde {desde}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <div className="panel p-4">
          <dt className="text-sm text-gris">Calificación</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold" style={{ fontStretch: '87.5%' }}>
            {u.promedio ? String(u.promedio).replace('.', ',') : 'Nuevo'}
            {u.promedio && <Star className="ml-1 inline size-6 -translate-y-0.5 fill-muralla text-muralla" aria-label="de 5" />}
          </dd>
          <dd className="text-sm text-gris">{u.totalCalificaciones} {u.totalCalificaciones === 1 ? 'opinión' : 'opiniones'}</dd>
        </div>
        <div className="panel p-4">
          <dt className="text-sm text-gris">Viajes como conductor</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold" style={{ fontStretch: '87.5%' }}>{u.viajesComoConductor}</dd>
          {u.vehiculo && <dd className="text-sm text-gris">{u.vehiculo}</dd>}
        </div>
      </dl>

      <section aria-labelledby="titulo-opiniones">
        <h2 id="titulo-opiniones" className="mb-3 text-xl font-bold">Lo que dicen quienes han viajado con {u.nombre.split(' ')[0]}</h2>
        {u.comentarios.length === 0 ? (
          <p className="panel p-4 text-gris">Todavía no tiene calificaciones.</p>
        ) : (
          <ul className="panel divide-y divide-linea">
            {u.comentarios.map((c, i) => (
              <li key={i} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <Reputacion promedio={c.puntaje} total={1} className="[&>span:nth-child(3)]:hidden" />
                  <span className="text-sm text-gris">{haceCuanto(c.creadoEn)}</span>
                </div>
                {c.comentario && <p className="mt-1">{c.comentario}</p>}
                <p className="mt-1 text-sm text-gris">{c.autor}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
