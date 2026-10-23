import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El logo y otras imágenes pequeñas quedan dentro del código (necesario para la demo de un solo archivo)
  build: { assetsInlineLimit: 200 * 1024 },
  server: {
    port: 5173,
    // En desarrollo, /api se redirige al backend para evitar problemas de CORS
    proxy: { '/api': 'http://localhost:4000' },
  },
});
