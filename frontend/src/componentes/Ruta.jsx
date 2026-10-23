// La línea de ruta: origen y destino unidos como en un mapa de transporte.
// Es el elemento visual que identifica a Uniruta en toda la app.

export default function Ruta({ origen, destino, grande = false, tachada = false }) {
  const texto = grande ? 'text-xl md:text-2xl' : 'text-base';
  const punto = grande ? 'size-4' : 'size-3';
  return (
    <div className={`grid grid-cols-[auto_1fr] gap-x-3 ${tachada ? 'opacity-60' : ''}`}>
      {/* columna de la línea */}
      <div className="flex flex-col items-center pt-[0.4em]" aria-hidden="true">
        <span className={`${punto} shrink-0 rounded-full border-[3px] border-tinta bg-white`} />
        <span className={`my-1 w-[5px] flex-1 rounded-full bg-muralla ${grande ? 'min-h-8' : 'min-h-5'}`} />
        <span className={`${punto} shrink-0 rounded-full bg-tinta`} />
      </div>
      <div className="flex flex-col justify-between gap-3">
        <p className={`font-display font-bold leading-tight ${texto} ${tachada ? 'line-through' : ''}`} style={{ fontStretch: '87.5%' }}>
          <span className="sr-only">Desde </span>
          {origen}
        </p>
        <p className={`font-display font-bold leading-tight ${texto} ${tachada ? 'line-through' : ''}`} style={{ fontStretch: '87.5%' }}>
          <span className="sr-only">hasta </span>
          {destino}
        </p>
      </div>
    </div>
  );
}
