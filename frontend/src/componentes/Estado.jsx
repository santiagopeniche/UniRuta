// Etiqueta del estado de una solicitud o de un viaje.
const ESTILOS = {
  pendiente: ['bg-ambar-claro text-ambar', 'Esperando respuesta'],
  aceptada: ['bg-exito-claro text-exito', 'Cupo confirmado'],
  rechazada: ['bg-alerta-claro text-alerta', 'No aceptada'],
  cancelada: ['bg-fondo text-gris', 'Cancelada'],
  activo: ['bg-mar-claro text-mar-oscuro', 'Publicado'],
  finalizado: ['bg-fondo text-gris', 'Terminado'],
  cancelado: ['bg-alerta-claro text-alerta', 'Cancelado'],
};

export default function Estado({ estado }) {
  const [clases, texto] = ESTILOS[estado] || ['bg-fondo text-gris', estado];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${clases}`}>{texto}</span>;
}
