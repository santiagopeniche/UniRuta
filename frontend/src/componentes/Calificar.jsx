// Calificación mutua al terminar el viaje (RF-07, HU-06).
import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { useAviso } from '../contexto/Aviso';
import { SelectorEstrellas } from './Estrellas';
import { Avatar, MensajeError } from './Basicos';

function FormularioPersona({ viajeId, persona, alTerminar }) {
  const avisar = useAviso();
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!puntaje) return setError('Elige de 1 a 5 estrellas');
    setError('');
    setEnviando(true);
    try {
      await api.calificar(viajeId, { calificadoId: persona.id, puntaje, comentario });
      avisar(`Calificaste a ${persona.nombre.split(' ')[0]}`);
      alTerminar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3 border-t border-linea pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-3">
        <Avatar nombre={persona.nombre} />
        <div>
          <p className="font-bold">{persona.nombre}</p>
          <p className="text-sm text-gris">{persona.papel === 'conductor' ? 'Conductor' : 'Pasajero'}</p>
        </div>
      </div>
      <SelectorEstrellas nombre={`puntaje-${persona.id}`} valor={puntaje} onChange={setPuntaje} />
      <div>
        <label htmlFor={`comentario-${persona.id}`} className="etiqueta">
          Comentario <span className="font-normal text-gris">(opcional)</span>
        </label>
        <textarea id={`comentario-${persona.id}`} rows={2} maxLength={300} className="campo" placeholder="¿Fue puntual? ¿Te sentiste seguro?"
          value={comentario} onChange={(e) => setComentario(e.target.value)} />
      </div>
      <MensajeError>{error}</MensajeError>
      <button type="submit" disabled={enviando} className="boton-principal">
        {enviando ? 'Enviando' : 'Enviar calificación'}
      </button>
    </form>
  );
}

export default function Calificar({ viajeId }) {
  const [datos, setDatos] = useState(null);
  const cargar = () => api.calificacionesDelViaje(viajeId).then(setDatos).catch(() => setDatos({ personas: [] }));
  useEffect(() => {
    cargar();
  }, [viajeId]);

  if (!datos || !datos.personas.length) return null;
  const faltan = datos.personas.filter((p) => !p.yaCalificado);

  return (
    <section aria-labelledby="titulo-calificar" className="panel p-4 md:p-6">
      <h2 id="titulo-calificar" className="text-xl font-bold">
        {faltan.length ? 'Califica tu viaje' : 'Ya calificaste este viaje'}
      </h2>
      <p className="mb-4 mt-1 text-gris">
        {faltan.length ? 'Tu calificación ayuda a que los demás sepan con quién viajan.' : 'Gracias. Tus calificaciones ya son visibles en los perfiles.'}
      </p>
      <div className="space-y-5">
        {faltan.map((p) => (
          <FormularioPersona key={p.id} viajeId={viajeId} persona={p} alTerminar={cargar} />
        ))}
        {datos.personas
          .filter((p) => p.yaCalificado)
          .map((p) => (
            <p key={p.id} className="flex items-center gap-2 text-gris">
              <CheckCircle2 className="size-5 text-exito" aria-hidden="true" />
              Calificaste a {p.nombre}
            </p>
          ))}
      </div>
    </section>
  );
}
