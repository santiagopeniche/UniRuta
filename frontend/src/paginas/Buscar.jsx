// Pantalla de inicio: buscar viajes por ruta y horario (RF-04, HU-03).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useSesion } from '../contexto/Sesion';
import CamposRuta from '../componentes/CamposRuta';
import TarjetaViaje from '../componentes/TarjetaViaje';
import { Cargando, MensajeError, Vacio } from '../componentes/Basicos';
import { hoyColombia } from '../utils/formato';

const FRANJAS = [
  { id: '', texto: 'Cualquier hora' },
  { id: 'madrugada', texto: 'Temprano (5 a 8 a. m.)', desde: '05:00', hasta: '08:00' },
  { id: 'manana', texto: 'Mañana (8 a. m. a 12 m.)', desde: '08:00', hasta: '12:00' },
  { id: 'tarde', texto: 'Tarde (12 m. a 6 p. m.)', desde: '12:00', hasta: '18:00' },
  { id: 'noche', texto: 'Noche (6 a 10 p. m.)', desde: '18:00', hasta: '22:00' },
];

export default function Buscar() {
  const { usuario } = useSesion();
  const [ruta, setRuta] = useState({ origen: '', destino: '' });
  const [dia, setDia] = useState('');
  const [franja, setFranja] = useState('');
  const [viajes, setViajes] = useState(null);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState('');
  const [pendientes, setPendientes] = useState(0);

  async function buscar(filtros = {}) {
    setError('');
    setViajes(null);
    try {
      const { viajes: lista } = await api.buscarViajes(filtros);
      setViajes(lista);
    } catch (e) {
      setError(e.message);
      setViajes([]);
    }
  }

  useEffect(() => {
    buscar();
    if (usuario.rol === 'conductor') {
      api.solicitudesRecibidas().then(({ solicitudes }) => setPendientes(solicitudes.length)).catch(() => {});
    }
  }, [usuario.rol]);

  function enviar(e) {
    e.preventDefault();
    const f = FRANJAS.find((x) => x.id === franja);
    setBuscado(true);
    buscar({ origen: ruta.origen, destino: ruta.destino, fecha: dia, horaDesde: f?.desde, horaHasta: f?.hasta });
  }

  function limpiar() {
    setRuta({ origen: '', destino: '' });
    setDia('');
    setFranja('');
    setBuscado(false);
    buscar();
  }

  const nombre = usuario.nombre.split(' ')[0];
  const opcionesDia = [
    { valor: '', texto: 'Cualquier día' },
    { valor: hoyColombia(), texto: 'Hoy' },
    { valor: hoyColombia(1), texto: 'Mañana' },
  ];

  return (
    <div className="space-y-8">
      {pendientes > 0 && (
        <Link to="/solicitudes" className="flex items-center justify-between gap-3 rounded-xl bg-tinta px-4 py-3 text-white">
          <span>
            <strong>{pendientes === 1 ? '1 persona' : `${pendientes} personas`}</strong> te {pendientes === 1 ? 'pidió' : 'pidieron'} cupo
          </span>
          <span className="font-bold text-muralla underline underline-offset-4">Responder</span>
        </Link>
      )}

      <section aria-labelledby="titulo-buscar">
        <h1 id="titulo-buscar" className="text-[2rem] font-extrabold md:text-[2.5rem]">
          ¿Para dónde vas, {nombre}?
        </h1>

        <form onSubmit={enviar} className="panel mt-5 space-y-5 p-4 md:p-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-linea px-3.5 py-1.5 text-sm font-bold hover:border-tinta/40"
              onClick={() => setRuta({ origen: ruta.origen === 'Campus' ? '' : ruta.origen, destino: 'Campus' })}>
              Voy al campus
            </button>
            <button type="button" className="rounded-full border border-linea px-3.5 py-1.5 text-sm font-bold hover:border-tinta/40"
              onClick={() => setRuta({ origen: 'Campus', destino: ruta.destino === 'Campus' ? '' : ruta.destino })}>
              Salgo del campus
            </button>
          </div>

          <CamposRuta origen={ruta.origen} destino={ruta.destino} onCambio={setRuta} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dia" className="etiqueta">Día</label>
              <div className="flex gap-2">
                <select id="dia" className="campo" value={opcionesDia.some((o) => o.valor === dia) ? dia : 'otro'}
                  onChange={(e) => setDia(e.target.value === 'otro' ? hoyColombia(2) : e.target.value)}>
                  {opcionesDia.map((o) => (
                    <option key={o.texto} value={o.valor}>{o.texto}</option>
                  ))}
                  <option value="otro">Otro día</option>
                </select>
                {!opcionesDia.some((o) => o.valor === dia) && (
                  <input type="date" aria-label="Fecha" className="campo" min={hoyColombia()} value={dia} onChange={(e) => setDia(e.target.value)} />
                )}
              </div>
            </div>
            <div>
              <label htmlFor="franja" className="etiqueta">Hora de salida</label>
              <select id="franja" className="campo" value={franja} onChange={(e) => setFranja(e.target.value)}>
                {FRANJAS.map((f) => (
                  <option key={f.id} value={f.id}>{f.texto}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="boton-principal w-full">Buscar viajes</button>
        </form>
      </section>

      <section aria-labelledby="titulo-resultados" aria-live="polite">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="titulo-resultados" className="text-xl font-bold">
            {buscado ? 'Viajes que coinciden' : 'Próximos viajes'}
            {viajes?.length > 0 && <span className="ml-2 font-sans text-base font-normal text-gris">{viajes.length}</span>}
          </h2>
          {buscado && (
            <button type="button" onClick={limpiar} className="text-sm font-bold text-mar underline underline-offset-4">
              Ver todos
            </button>
          )}
        </div>

        <MensajeError>{error}</MensajeError>
        {viajes === null ? (
          <Cargando texto="Buscando viajes" />
        ) : viajes.length === 0 ? (
          <Vacio
            titulo={buscado ? 'No hay viajes con esos filtros' : 'Todavía no hay viajes publicados'}
            texto={
              buscado
                ? 'Prueba con otra hora o solo con el nombre del barrio. Los viajes nuevos aparecen aquí apenas se publican.'
                : 'Si tienes carro, publica tu trayecto y comparte los puestos libres.'
            }
            accion={usuario.rol === 'conductor' ? 'Publicar un viaje' : undefined}
            a="/publicar"
          />
        ) : (
          <ul className="space-y-3">
            {viajes.map((v) => (
              <li key={v.id}>
                <TarjetaViaje viaje={v} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
