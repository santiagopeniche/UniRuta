// Estructura de las pantallas con sesión: barra superior y navegación inferior en el celular.
import { NavLink, Link, Outlet } from 'react-router-dom';
import { Search, PlusCircle, CarFront, Bell, UserRound } from 'lucide-react';
import { useSesion } from '../contexto/Sesion';
import { MODO_DEMO } from '../api';
import isotipo from '../assets/isotipo-utb.png';
import isotipoBlanco from '../assets/isotipo-utb-blanco.png';

const SECCIONES = [
  { a: '/', texto: 'Buscar', icono: Search, fin: true },
  { a: '/publicar', texto: 'Publicar', icono: PlusCircle },
  { a: '/mis-viajes', texto: 'Mis viajes', icono: CarFront },
  { a: '/avisos', texto: 'Avisos', icono: Bell, contador: true },
  { a: '/perfil', texto: 'Perfil', icono: UserRound },
];

export function Logo({ claro = false }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-extrabold ${claro ? 'text-white' : 'text-tinta'}`} style={{ fontStretch: '87.5%' }}>
      {/* logo de la UTB */}
      <img src={claro ? isotipoBlanco : isotipo} alt="" className="h-7 w-auto" />
      Uniruta
    </span>
  );
}

function Contador({ n }) {
  if (!n) return null;
  return (
    <span className="absolute -right-2 -top-1.5 min-w-5 rounded-full bg-alerta px-1 text-center text-xs font-bold leading-5 text-white">
      {n > 9 ? '9+' : n}
      <span className="sr-only"> sin leer</span>
    </span>
  );
}

export function AvisoDemo() {
  if (!MODO_DEMO) return null;
  return (
    <p className="bg-muralla px-4 py-1.5 text-center text-sm font-bold text-tinta">
      Demo con datos de ejemplo. Nada de lo que hagas aquí sale del navegador.
    </p>
  );
}

export default function Marco() {
  const { noLeidos } = useSesion();

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <AvisoDemo />
      <header className="sticky top-0 z-30 border-b border-linea bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link to="/" aria-label="Uniruta UTB, inicio">
            <Logo />
          </Link>
          <nav aria-label="Principal" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {SECCIONES.map(({ a, texto, fin, contador }) => (
                <li key={a}>
                  <NavLink
                    to={a}
                    end={fin}
                    className={({ isActive }) =>
                      `relative rounded-lg px-3 py-2 font-bold transition-colors ${isActive ? 'bg-mar-claro text-mar-oscuro' : 'text-gris hover:text-tinta'}`
                    }
                  >
                    {texto}
                    {contador && <Contador n={noLeidos} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6">
        <Outlet />
      </main>

      {/* navegación inferior en el celular */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {SECCIONES.map(({ a, texto, icono: Icono, fin, contador }) => (
            <li key={a}>
              <NavLink
                to={a}
                end={fin}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold ${isActive ? 'text-mar' : 'text-gris'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icono className="size-6" strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                      {contador && <Contador n={noLeidos} />}
                    </span>
                    {texto}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
