// Publicar un viaje (RF-03, HU-02).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { api } from '../api';
import { useSesion } from '../contexto/Sesion';
import { useAviso } from '../contexto/Aviso';
import CamposRuta from '../componentes/CamposRuta';
import { MensajeError, Titulo } from '../componentes/Basicos';
import { hoyColombia } from '../utils/formato';

export default function Publicar() {
  const { usuario } = useSesion();
  const avisar = useAviso();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({
    origen: '',
    destino: 'UTB Campus Tecnológico (Ternera)',
    puntoEncuentro: '',
    fecha: hoyColombia(1),
    hora: '06:30',
    cupos: 3,
    aporteSugerido: '',
    notas: '',
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario.rol !== 'conductor') {
    return (
      <>
        <Titulo>Publicar un viaje</Titulo>
        <div className="panel p-6">
          <h2 className="text-lg font-bold">Primero activa el modo conductor</h2>
          <p className="mt-1 text-gris">
            Para ofrecer cupos necesitamos la placa de tu vehículo. Así los pasajeros saben en qué carro se van a subir.
          </p>
          <Link to="/perfil" className="boton-principal mt-5">Registrar mi vehículo</Link>
        </div>
      </>
    );
  }

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const cupos = (n) => setDatos({ ...datos, cupos: Math.min(6, Math.max(1, n)) });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { viaje } = await api.publicarViaje({
        ...datos,
        aporteSugerido: datos.aporteSugerido === '' ? null : Number(datos.aporteSugerido),
      });
      avisar('Viaje publicado');
      navegar(`/viajes/${viaje.id}`);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <>
      <Titulo detalle="Aparecerá de inmediato en las búsquedas de los demás.">Publicar un viaje</Titulo>

      <form onSubmit={enviar} className="space-y-6">
        <fieldset className="panel space-y-4 p-4 md:p-6">
          <legend className="sr-only">Ruta</legend>
          <CamposRuta origen={datos.origen} destino={datos.destino} requerido
            onCambio={(r) => setDatos({ ...datos, ...r })} ayudaOrigen="Sales de" ayudaDestino="Vas para" />
          <div>
            <label htmlFor="punto" className="etiqueta">Punto de encuentro</label>
            <input id="punto" required className="campo" placeholder="Ej.: parque principal, frente a la iglesia"
              value={datos.puntoEncuentro} onChange={cambiar('puntoEncuentro')} />
          </div>
        </fieldset>

        <fieldset className="panel grid gap-4 p-4 sm:grid-cols-2 md:p-6">
          <legend className="sr-only">Fecha, hora y cupos</legend>
          <div>
            <label htmlFor="fecha" className="etiqueta">Fecha</label>
            <input id="fecha" type="date" required className="campo" min={hoyColombia()} max={hoyColombia(30)}
              value={datos.fecha} onChange={cambiar('fecha')} />
          </div>
          <div>
            <label htmlFor="hora" className="etiqueta">Hora de salida</label>
            <input id="hora" type="time" required className="campo" value={datos.hora} onChange={cambiar('hora')} />
          </div>
          <div>
            <span id="etiqueta-cupos" className="etiqueta">Cupos para pasajeros</span>
            <div className="flex items-center gap-3" role="group" aria-labelledby="etiqueta-cupos">
              <button type="button" onClick={() => cupos(datos.cupos - 1)} disabled={datos.cupos <= 1}
                className="boton-secundario size-12 px-0" aria-label="Un cupo menos">
                <Minus className="size-5" aria-hidden="true" />
              </button>
              <output aria-live="polite" className="w-10 text-center font-display text-3xl font-extrabold">{datos.cupos}</output>
              <button type="button" onClick={() => cupos(datos.cupos + 1)} disabled={datos.cupos >= 6}
                className="boton-secundario size-12 px-0" aria-label="Un cupo más">
                <Plus className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="aporte" className="etiqueta">Aporte sugerido por persona <span className="font-normal text-gris">(opcional)</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gris">$</span>
              <input id="aporte" type="number" min="0" max="100000" step="500" inputMode="numeric" className="campo pl-7"
                placeholder="5000" aria-describedby="ayuda-aporte" value={datos.aporteSugerido} onChange={cambiar('aporteSugerido')} />
            </div>
            <p id="ayuda-aporte" className="mt-1.5 text-sm text-gris">Para la gasolina. Se acuerda y se paga por fuera de la app.</p>
          </div>
        </fieldset>

        <div className="panel p-4 md:p-6">
          <label htmlFor="notas" className="etiqueta">Algo más que deban saber <span className="font-normal text-gris">(opcional)</span></label>
          <textarea id="notas" rows={3} maxLength={300} className="campo resize-y" placeholder="Ej.: salgo puntual, paso por la Avenida Pedro de Heredia"
            value={datos.notas} onChange={cambiar('notas')} />
        </div>

        <MensajeError>{error}</MensajeError>
        <button type="submit" disabled={enviando} className="boton-principal w-full">
          {enviando ? 'Publicando' : 'Publicar viaje'}
        </button>
      </form>
    </>
  );
}
