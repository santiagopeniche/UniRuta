// Estructura de las pantallas de registro e inicio de sesión.
import { Logo, AvisoDemo } from './Marco';
import logoCompleto from '../assets/logo-utb.png';

export default function MarcoAcceso({ titulo, subtitulo, children }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="md:col-span-2">
        <AvisoDemo />
      </div>

      <aside className="relative overflow-hidden bg-tinta px-6 pb-10 pt-8 text-white md:flex md:flex-col md:justify-between md:px-12 md:py-12">
        <Logo claro />
        <div className="mt-10 max-w-md md:mt-0">
          <p className="font-display text-[2.1rem] font-extrabold leading-[1.05] md:text-5xl" style={{ fontStretch: '87.5%' }}>
            El que va para la U te lleva.
          </p>
          <p className="mt-4 max-w-sm text-white/75">
            Viajes compartidos solo entre estudiantes y colaboradores de la UTB, con cuenta verificada por correo institucional.
          </p>
        </div>
        {/* la línea de ruta, en grande, como firma visual */}
        <svg viewBox="0 0 400 120" className="mt-10 hidden w-full max-w-md md:block" aria-hidden="true">
          <path d="M14 96 C 120 96, 140 24, 250 24 S 360 60, 386 24" fill="none" stroke="#80BA25" strokeWidth="7" strokeLinecap="round" />
          <circle cx="14" cy="96" r="11" fill="#0B1936" stroke="#fff" strokeWidth="5" />
          <circle cx="386" cy="24" r="11" fill="#fff" />
          <text x="0" y="122" fill="#ffffff" fillOpacity=".7" fontSize="14" fontFamily="Atkinson Hyperlegible">Tu barrio</text>
          <text x="400" y="58" fill="#ffffff" fillOpacity=".7" fontSize="14" textAnchor="end" fontFamily="Atkinson Hyperlegible">Campus</text>
        </svg>
      </aside>

      <main className="flex items-start justify-center px-5 py-8 md:items-center md:px-12">
        <div className="w-full max-w-sm">
          <img src={logoCompleto} alt="Universidad Tecnológica de Bolívar" className="mb-8 hidden h-14 w-auto md:block" />
          <h1 className="text-[1.75rem] font-extrabold">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-gris">{subtitulo}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
