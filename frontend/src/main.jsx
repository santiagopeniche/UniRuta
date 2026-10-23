import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { ProveedorSesion } from './contexto/Sesion';
import { ProveedorAviso } from './contexto/Aviso';
import { MODO_DEMO } from './api';
import './index.css';

// La demo se publica como página estática, así que usa rutas con # para no depender del servidor
const Enrutador = MODO_DEMO ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Enrutador>
      <ProveedorSesion>
        <ProveedorAviso>
          <App />
        </ProveedorAviso>
      </ProveedorSesion>
    </Enrutador>
  </StrictMode>
);
