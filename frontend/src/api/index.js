// Punto único de acceso a los datos. Con VITE_DEMO=true se usa la API simulada (sin servidor).
import { api as apiReal, sesion, ErrorApi } from './http';
import { apiDemo } from './demo';

export const MODO_DEMO = import.meta.env.VITE_DEMO === 'true';
export const api = MODO_DEMO ? apiDemo : apiReal;
export { sesion, ErrorApi };
