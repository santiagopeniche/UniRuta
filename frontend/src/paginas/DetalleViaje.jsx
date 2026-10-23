// Detalle de un viaje. Lo que se puede hacer depende de si eres el conductor o un pasajero.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Users, Banknote, StickyNote, Phone, MessageCircle } from 'lucide-react';
import { api } from '../api';
import { useAviso } from '../contexto/Aviso';
import Ruta from '../componentes/Ruta';
import Estado from '../componentes/Estado';
import { Reputacion } from '../componentes/Estrellas';
import { Avatar, Cargando, MensajeError } from '../componentes/Basicos';
import BotonConfirmar from '../componentes/BotonConfirmar';
import FilaSolicitud from '../componentes/FilaSolicitud';
import Calificar from '../componentes/Calificar';
import { fechaCorta, horaLegible, dinero } from '../utils/formato';

function Dato({ icono: Icono, titulo, children }) {
  return (
    <div className="flex gap-3 py-3">
      <Icono className="mt-0.5 size-5 shrink-0 text-gris" aria-hidden="true" />
      <div>
        <dt className="text-sm text-gris">{titulo}</dt>
        <dd className="font-bold">{children}</dd>
      </div>
    </div>
  );
}

const whatsapp = (tel) => `https://wa.me/57${tel.replace(/\D/g, '').slice(-10)}`;

function Contacto({ telefono }) {
  if (!telefono) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a href={`tel:${telefono.replace(/\s/g, '')}`} className="boton-secundario min-h-10 px-3 text-sm">
        <Phone className="size-4" aria-hidden="true" />
        Llamar
      </a>
      <a href={whatsapp(telefono)} target="_blank" rel="noreferrer" className="boton-secundario min-h-10 px-3 text-sm">
        <MessageCircle className="size-4" aria-hidden="true" />
        WhatsApp
      </a>
    </div>
  );
}

/** Lo que ve un pasajero según el estado de su solicitud (RF-05, HU-04). */
function AccionPasajero({ viaje, recargar }) {
  const avisar = useAviso();
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const s = viaje.miSolicitud;
  const salio = new Date(viaje.fechaHora) <= new Date();

  async function pedir(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.pedirCupo(viaje.id, mensaje);
      avisar('Cupo pedido. Te avisamos cuando el conductor responda.');
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function cancelar() {
    try {
      await api.cancelarSolicitud(s.id);
      avisar(s.estado === 'aceptada' ? 'Cancelaste tu cupo' : 'Cancelaste tu solicitud');
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  }

  // En viajes terminados, cancelados o que ya salieron no hay nada que pedir ni cancelar
  if (viaje.estado !== 'activo' || salio) return null;

  if (s?.estado === 'pendiente') {
    return (
      <section className="panel space-y-3 p-4 md:p-6">
        <Estado estado="pendiente" />
        <p>Le avisamos al conductor. Cuando responda, te llega un aviso aquí en la app.</p>
        <BotonConfirmar texto="Cancelar mi solicitud" pregunta="¿Cancelar tu solicitud de cupo?" confirmar="Sí, cancelar" onConfirmar={cancelar} />
      </section>
    );
  }
  if (s?.estado === 'aceptada') {
    return (
      <section className="space-y-3 rounded-xl border border-exito/30 bg-exito-claro p-4 md:p-6">
        <h2 className="text-xl font-bold text-exito">Tienes cupo en este viaje</h2>
        <p>Llega al punto de encuentro unos minutos antes. Abajo tienes el contacto del conductor.</p>
        <BotonConfirmar texto="Cancelar mi cupo" pregunta="¿Cancelar tu cupo? El conductor recibirá un aviso." confirmar="Sí, cancelar mi cupo" onConfirmar={cancelar} />
      </section>
    );
  }
  if (s?.estado === 'rechazada') {
    return (
      <section className="panel p-4 md:p-6">
        <Estado estado="rechazada" />
        <p className="mt-2">El conductor no pudo llevarte en este viaje. Busca otro a una hora parecida.</p>
        <Link to="/" className="boton-secundario mt-3">Buscar otro viaje</Link>
      </section>
    );
  }
  if (viaje.cuposDisponibles === 0) {
    return <p className="panel p-4 font-bold text-alerta">Este viaje ya no tiene cupos.</p>;
  }

  return (
    <form onSubmit={pedir} className="panel space-y-3 p-4 md:p-6">
      <h2 className="text-xl font-bold">{s?.estado === 'cancelada' ? 'Volver a pedir cupo' : 'Pedir un cupo'}</h2>
      <div>
        <label htmlFor="mensaje" className="etiqueta">
          Mensaje para el conductor <span className="font-normal text-gris">(opcional)</span>
        </label>
        <input id="mensaje" maxLength={200} className="campo" placeholder="Ej.: me subo en la entrada de Turbaco"
          value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
      </div>
      <MensajeError>{error}</MensajeError>
      <button type="submit" disabled={enviando} className="boton-principal w-full">
        {enviando ? 'Pidiendo cupo' : 'Pedir cupo'}
      </button>
    </form>
  );
}

/** Lo que ve el conductor: solicitudes, pasajeros y acciones sobre el viaje. */
function PanelConductor({ viaje, recargar }) {
  const avisar = useAviso();
  const pendientes = viaje.solicitudes.filter((s) => s.estado === 'pendiente');
  const otras = viaje.solicitudes.filter((s) => s.estado !== 'pendiente' && s.estado !== 'aceptada');
  const activo = viaje.estado === 'activo';
  const puedeFinalizar = activo && Date.now() >= new Date(viaje.fechaHora).getTime() - 30 * 60000;

  async function accion(fn, texto) {
    try {
      await fn(viaje.id);
      avisar(texto);
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  return (
    <>
      {activo && (
        <section aria-labelledby="titulo-solicitudes" className="panel px-4 pt-4 md:px-6 md:pt-6">
          <h2 id="titulo-solicitudes" className="text-xl font-bold">
            Solicitudes {pendientes.length > 0 && <span className="font-sans text-base font-normal text-gris">{pendientes.length} por responder</span>}
          </h2>
          {pendientes.length === 0 ? (
            <p className="pb-5 pt-1 text-gris">Nadie ha pedido cupo todavía. Cuando alguien lo haga te llega un aviso.</p>
          ) : (
            <div className="divide-y divide-linea">
              {pendientes.map((s) => (
                <FilaSolicitud key={s.id} solicitud={s} alResponder={recargar} sinCupos={viaje.cuposDisponibles === 0} />
              ))}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="titulo-pasajeros" className="panel px-4 pt-4 md:px-6 md:pt-6">
        <h2 id="titulo-pasajeros" className="text-xl font-bold">Pasajeros confirmados</h2>
        {viaje.solicitudes.some((s) => s.estado === 'aceptada') ? (
          <div className="divide-y divide-linea">
            {viaje.solicitudes
              .filter((s) => s.estado === 'aceptada')
              .map((s) => (
                <FilaSolicitud key={s.id} solicitud={s} />
              ))}
          </div>
        ) : (
          <p className="pb-5 pt-1 text-gris">Aún no has aceptado a nadie.</p>
        )}
        {otras.length > 0 && (
          <details className="border-t border-linea py-3">
            <summary className="cursor-pointer text-sm font-bold text-gris">Ver {otras.length} solicitudes rechazadas o canceladas</summary>
            <div className="divide-y divide-linea">
              {otras.map((s) => (
                <FilaSolicitud key={s.id} solicitud={s} />
              ))}
            </div>
          </details>
        )}
      </section>

      {activo && (
        <section className="flex flex-col gap-3 sm:flex-row">
          {puedeFinalizar ? (
            <BotonConfirmar className="flex-1" estilo="boton-principal" texto="Terminar viaje"
              pregunta="¿Ya llegaron? Al terminarlo, todos podrán calificarse." confirmar="Sí, terminar"
              onConfirmar={() => accion(api.finalizarViaje, 'Viaje terminado')} />
          ) : (
            <p className="flex-1 text-sm text-gris">Podrás marcarlo como terminado desde 30 minutos antes de la salida.</p>
          )}
          <BotonConfirmar className="sm:w-auto" texto="Cancelar viaje"
            pregunta="¿Cancelar el viaje? Se les avisará a todos los que pidieron cupo." confirmar="Sí, cancelar viaje"
            onConfirmar={() => accion(api.cancelarViaje, 'Viaje cancelado')} />
        </section>
      )}
    </>
  );
}

export default function DetalleViaje() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [viaje, setViaje] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api
      .viaje(id)
      .then(({ viaje: v }) => setViaje(v))
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(cargar, [cargar]);

  if (error) return <MensajeError>{error}</MensajeError>;
  if (!viaje) return <Cargando />;

  const c = viaje.conductor;
  const confirmado = viaje.esConductor || viaje.miSolicitud?.estado === 'aceptada';

  return (
    <article className="space-y-5">
      <button type="button" onClick={() => navegar(-1)} className="-ml-1 inline-flex items-center gap-1 font-bold text-gris hover:text-tinta">
        <ChevronLeft className="size-5" aria-hidden="true" />
        Volver
      </button>

      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-[1.75rem] font-extrabold leading-none md:text-[2rem]" style={{ fontStretch: '87.5%' }}>
            {fechaCorta(viaje.fecha)}, {horaLegible(viaje.hora)}
          </p>
          {viaje.estado !== 'activo' && <Estado estado={viaje.estado} />}
        </div>
        <h1 className="sr-only">
          Viaje de {viaje.origen} a {viaje.destino}
        </h1>
        <Ruta origen={viaje.origen} destino={viaje.destino} grande tachada={viaje.estado === 'cancelado'} />
      </header>

      <dl className="panel divide-y divide-linea px-4 md:px-6">
        <Dato icono={MapPin} titulo="Punto de encuentro">{viaje.puntoEncuentro}</Dato>
        <Dato icono={Users} titulo="Cupos">
          {viaje.cuposDisponibles} de {viaje.cuposTotales} libres
        </Dato>
        {viaje.aporteSugerido != null && (
          <Dato icono={Banknote} titulo="Aporte sugerido por persona">
            {dinero(viaje.aporteSugerido)} <span className="font-normal text-gris">(se paga por fuera de la app)</span>
          </Dato>
        )}
        {viaje.notas && <Dato icono={StickyNote} titulo="Notas del conductor">{viaje.notas}</Dato>}
      </dl>

      {!viaje.esConductor && <AccionPasajero viaje={viaje} recargar={cargar} />}

      {!viaje.esConductor && (
        <section aria-labelledby="titulo-conductor" className="panel p-4 md:p-6">
          <h2 id="titulo-conductor" className="sr-only">Conductor</h2>
          <div className="flex items-center gap-3">
            <Avatar nombre={c.nombre} />
            <div>
              <Link to={`/usuarios/${c.id}`} className="font-bold underline-offset-4 hover:underline">{c.nombre}</Link>
              <div className="flex flex-wrap items-center gap-x-3">
                <Reputacion promedio={c.promedio} total={c.totalCalificaciones} />
              </div>
            </div>
          </div>
          {(c.vehiculo || c.placa) && (
            <p className="mt-3 text-gris">
              {c.vehiculo}
              {c.placa && <>{c.vehiculo ? ', placa ' : 'Placa '}<strong className="text-tinta">{c.placa}</strong></>}
            </p>
          )}
          {confirmado ? <Contacto telefono={c.telefono} /> : <p className="mt-3 text-sm text-gris">Verás su celular y la placa cuando te acepte.</p>}
        </section>
      )}

      {viaje.esConductor && <PanelConductor viaje={viaje} recargar={cargar} />}

      {!viaje.esConductor && confirmado && viaje.pasajeros?.length > 1 && (
        <section className="panel p-4 md:p-6">
          <h2 className="font-bold">También van</h2>
          <ul className="mt-2 text-gris">
            {viaje.pasajeros.map((p) => (
              <li key={p.id}>{p.nombre}</li>
            ))}
          </ul>
        </section>
      )}

      {viaje.puedeCalificar && <Calificar viajeId={viaje.id} />}
    </article>
  );
}
