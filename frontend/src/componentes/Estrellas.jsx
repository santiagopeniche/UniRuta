import { Star } from 'lucide-react';

/** Muestra la reputación: "4,5 ★ (12)" o "Nuevo" si aún no tiene calificaciones. */
export function Reputacion({ promedio, total, className = '' }) {
  if (!total) return <span className={`text-sm text-gris ${className}`}>Sin calificaciones aún</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <Star className="size-4 fill-muralla text-muralla" aria-hidden="true" />
      <span className="font-bold">{String(promedio).replace('.', ',')}</span>
      <span className="text-gris">({total})</span>
      <span className="sr-only">de 5, con {total} calificaciones</span>
    </span>
  );
}

const DESCRIPCIONES = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

/** Selector de 1 a 5 estrellas accesible con teclado (radio buttons). */
export function SelectorEstrellas({ valor, onChange, nombre }) {
  return (
    <fieldset>
      <legend className="sr-only">Puntaje</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-md p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-turquesa">
            <input type="radio" name={nombre} value={n} checked={valor === n} onChange={() => onChange(n)} className="sr-only" />
            <Star
              className={`size-9 transition-colors ${n <= valor ? 'fill-muralla text-muralla' : 'fill-transparent text-linea'}`}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="sr-only">
              {n} {n === 1 ? 'estrella' : 'estrellas'}
            </span>
          </label>
        ))}
        <span className="ml-2 min-w-20 text-sm font-bold text-gris">{DESCRIPCIONES[valor]}</span>
      </div>
    </fieldset>
  );
}
