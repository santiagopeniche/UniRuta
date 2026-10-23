// Perfil: datos básicos, rol (pasajero o conductor) y vehículo. Muestra la reputación propia.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useSesion } from '../contexto/Sesion';
import { useAviso } from '../contexto/Aviso';
import { Avatar, MensajeError, Titulo } from '../componentes/Basicos';
import { Reputacion } from '../componentes/Estrellas';

export default function Perfil() {
  const { usuario, setUsuario, salir } = useSesion();
  const avisar = useAviso();
  const [parametros] = useSearchParams();
  const [datos, setDatos] = useState({
    nombre: usuario.nombre,
    telefono: usuario.telefono || '',
    rol: usuario.rol,
    placa: usuario.placa || '',
    vehiculo: usuario.vehiculo || '',
  });
  const [reputacion, setReputacion] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.perfilPublico(usuario.id).then(({ usuario: u }) => setReputacion(u)).catch(() => {});
  }, [usuario.id]);

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const conductor = datos.rol === 'conductor';

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const { usuario: u } = await api.actualizarPerfil(datos);
      setUsuario(u);
      avisar('Cambios guardados');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {parametros.get('bienvenida') && (
        <div className="mb-5 rounded-xl border border-exito/30 bg-exito-claro p-4">
          <p className="font-bold text-exito">Tu cuenta está confirmada.</p>
          <p className="mt-1">Si tienes carro, activa el modo conductor abajo. Si no, ya puedes <Link to="/" className="font-bold underline underline-offset-4">buscar un viaje</Link>.</p>
        </div>
      )}

      <Titulo>Tu perfil</Titulo>

      <section className="panel mb-5 flex items-center gap-4 p-4 md:p-6">
        <Avatar nombre={usuario.nombre} grande />
        <div className="min-w-0">
          <p className="text-lg font-bold">{usuario.nombre}</p>
          <p className="truncate text-gris">{usuario.correo}</p>
          {reputacion && (
            <Link to={`/usuarios/${usuario.id}`} className="mt-1 inline-block underline-offset-4 hover:underline">
              <Reputacion promedio={reputacion.promedio} total={reputacion.totalCalificaciones} />
            </Link>
          )}
        </div>
      </section>

      <form onSubmit={guardar} className="space-y-5">
        <fieldset className="panel p-4 md:p-6">
          <legend className="sr-only">¿Cómo vas a usar Uniruta?</legend>
          <p className="etiqueta" aria-hidden="true">¿Cómo vas a usar Uniruta?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['pasajero', 'Busco cupos', 'No tengo carro o no lo uso'],
              ['conductor', 'Ofrezco cupos', 'Tengo carro y comparto puestos'],
            ].map(([valor, titulo, texto]) => (
              <label
                key={valor}
                className={`cursor-pointer rounded-[10px] border-2 p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-turquesa ${
                  datos.rol === valor ? 'border-mar bg-mar-claro' : 'border-linea bg-white hover:border-tinta/30'
                }`}
              >
                <input type="radio" name="rol" value={valor} checked={datos.rol === valor} onChange={cambiar('rol')} className="sr-only" />
                <span className="block font-bold">{titulo}</span>
                <span className="block text-sm text-gris">{texto}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-gris">Puedes cambiarlo cuando quieras. Como conductor también puedes pedir cupo en otros viajes.</p>
        </fieldset>

        {conductor && (
          <fieldset className="panel grid gap-4 p-4 sm:grid-cols-2 md:p-6">
            <legend className="sr-only">Tu vehículo</legend>
            <div>
              <label htmlFor="placa" className="etiqueta">Placa</label>
              <input id="placa" required className="campo uppercase" placeholder="ABC123" maxLength={8} aria-describedby="ayuda-placa"
                value={datos.placa} onChange={cambiar('placa')} />
              <p id="ayuda-placa" className="mt-1.5 text-sm text-gris">Solo la ven tus pasajeros confirmados.</p>
            </div>
            <div>
              <label htmlFor="vehiculo" className="etiqueta">Marca, modelo y color</label>
              <input id="vehiculo" className="campo" placeholder="Ej.: Chevrolet Spark gris" maxLength={80}
                value={datos.vehiculo} onChange={cambiar('vehiculo')} />
            </div>
          </fieldset>
        )}

        <fieldset className="panel grid gap-4 p-4 sm:grid-cols-2 md:p-6">
          <legend className="sr-only">Tus datos</legend>
          <div>
            <label htmlFor="nombre" className="etiqueta">Nombre</label>
            <input id="nombre" required className="campo" value={datos.nombre} onChange={cambiar('nombre')} />
          </div>
          <div>
            <label htmlFor="telefono" className="etiqueta">Celular</label>
            <input id="telefono" type="tel" inputMode="tel" className="campo" placeholder="300 123 4567" value={datos.telefono} onChange={cambiar('telefono')} />
          </div>
        </fieldset>

        <MensajeError>{error}</MensajeError>
        <button type="submit" disabled={guardando} className="boton-principal w-full">
          {guardando ? 'Guardando' : 'Guardar cambios'}
        </button>
      </form>

      <button type="button" onClick={salir} className="boton-secundario mt-8 w-full">
        Cerrar sesión
      </button>
    </>
  );
}
