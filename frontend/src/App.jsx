import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSesion } from './contexto/Sesion';
import Marco from './componentes/Marco';
import { Cargando } from './componentes/Basicos';
import Entrar from './paginas/Entrar';
import Registro from './paginas/Registro';
import Verificar from './paginas/Verificar';
import Buscar from './paginas/Buscar';
import Publicar from './paginas/Publicar';
import DetalleViaje from './paginas/DetalleViaje';
import MisViajes from './paginas/MisViajes';
import Solicitudes from './paginas/Solicitudes';
import Avisos from './paginas/Avisos';
import Perfil from './paginas/Perfil';
import PerfilPublico from './paginas/PerfilPublico';

/** Solo deja pasar si hay sesión; si no, manda a "Entrar" y luego regresa. */
function ConSesion({ children }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ desde: ubicacion.pathname }} />;
  return children;
}

function SinSesion({ children }) {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  if (usuario) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<SinSesion><Entrar /></SinSesion>} />
      <Route path="/registro" element={<SinSesion><Registro /></SinSesion>} />
      <Route path="/verificar" element={<Verificar />} />

      <Route element={<ConSesion><Marco /></ConSesion>}>
        <Route index element={<Buscar />} />
        <Route path="publicar" element={<Publicar />} />
        <Route path="viajes/:id" element={<DetalleViaje />} />
        <Route path="mis-viajes" element={<MisViajes />} />
        <Route path="solicitudes" element={<Solicitudes />} />
        <Route path="avisos" element={<Avisos />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="usuarios/:id" element={<PerfilPublico />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
