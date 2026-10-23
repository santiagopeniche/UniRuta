# Uniruta UTB

Plataforma web de carpooling exclusiva para la comunidad de la Universidad Tecnológica de Bolívar. Conecta a conductores con cupos libres y pasajeros que van por la misma ruta, verificando la identidad de cada usuario con su correo institucional `@utb.edu.co`.

Proyecto de Aula de Ingeniería de Software (grupo 1206, semestre 202602). Equipo: Sebastian Peniche Gonzalez, Santiago Peniche Gonzalez y Daniel Alejandro Castro Miranda (Scrum Master).

## Qué hace (MVP)

| Requerimiento | Funcionalidad | Dónde está en el código | Pruebas |
| --- | --- | --- | --- |
| RF-01 | Registro solo con correo `@utb.edu.co` y correo de confirmación | `backend/src/modules/usuarios` | `tests/usuarios.test.js`, `tests/validacion.test.js` |
| RF-02 | Inicio de sesión (con correo confirmado) | `backend/src/modules/usuarios` | `tests/usuarios.test.js` |
| RF-03 | Publicar viaje: origen, destino, punto de encuentro, fecha, hora, cupos, aporte sugerido | `backend/src/modules/viajes` | `tests/viajes.test.js` |
| RF-04 | Buscar por ruta (sin importar tildes) y franja horaria; solo viajes con cupos | `backend/src/modules/viajes` | `tests/viajes.test.js` |
| RF-05 | Pedir cupo; la solicitud queda pendiente y el conductor recibe un aviso | `backend/src/modules/solicitudes` | `tests/solicitudes.test.js` |
| RF-06 | Aceptar (descuenta cupo) o rechazar (no cambia) con aviso al pasajero | `backend/src/modules/solicitudes` | `tests/solicitudes.test.js` |
| RF-07 | Calificación mutua de 1 a 5, una sola vez por compañero y viaje | `backend/src/modules/calificaciones` | `tests/calificaciones.test.js` |
| RNF-01 | Contraseñas cifradas con bcrypt; solo dominio institucional | `usuarios.service.js` | `tests/usuarios.test.js` |
| RNF-03 | Búsqueda en menos de 2 s con 200 viajes | índice `idx_viaje_busqueda` | `tests/rendimiento.test.js` |

Además: perfil con modo pasajero/conductor y placa, historial de viajes, cancelación de solicitudes y viajes, perfil público con reputación y avisos dentro de la app.

## Tecnologías

- **Identidad visual:** logo y azul (`#093AD8`) de la UTB; los archivos del logo están en `frontend/src/assets/`.
- **Frontend:** React 18, React Router, Tailwind CSS 4, Vite (`frontend/`)
- **Backend:** Node.js, Express, `pg`, JWT, bcrypt, Nodemailer (`backend/`)
- **Base de datos:** PostgreSQL
- **Pruebas:** Jest y Supertest (unitarias e integración contra PostgreSQL real)
- **Despliegue:** Render (API y base de datos) y Vercel (aplicación web)
- **CI:** GitHub Actions corre las pruebas en cada push (`.github/workflows/ci.yml`)

## Estructura

```
backend/
  src/
    app.js              aplicación Express (rutas y middlewares)
    server.js           arranque del servidor
    config.js           variables de entorno
    db/                 schema.sql, conexión, carga de datos de ejemplo
    middleware/         sesión (JWT) y manejo de errores
    modules/            un módulo por tema, como en el diagrama de componentes:
      usuarios/         registro, verificación, login, perfil
      viajes/           publicar, buscar, detalle, terminar, cancelar, historial
      solicitudes/      pedir cupo, aceptar, rechazar, cancelar
      calificaciones/   calificación mutua
      avisos/           notificaciones en la app (y por correo, opcional)
      correo/           envío de correos
    utils/              validaciones y errores
  tests/                pruebas Jest
frontend/
  src/
    api/                cliente de la API real y API simulada para la demo
    componentes/        piezas reutilizables (Ruta, TarjetaViaje, ...)
    paginas/            una pantalla por archivo
    contexto/           sesión y mensajes emergentes
```

## Cómo correrlo en tu computador

### Requisitos

- Node.js 20.19 o superior (`node -v`)
- PostgreSQL 14 o superior corriendo en tu máquina

### 1. Crear las bases de datos

Con pgAdmin o con `psql`:

```sql
CREATE DATABASE uniruta;
CREATE DATABASE uniruta_test;   -- solo para las pruebas automáticas
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # en Windows: copy .env.example .env
```

Abre `.env` y ajusta `DATABASE_URL` y `TEST_DATABASE_URL` con tu usuario y contraseña de PostgreSQL, y pon cualquier texto largo en `JWT_SECRET`. Luego:

```bash
npm run db:seed     # crea las tablas y carga datos de ejemplo
npm run dev         # API en http://localhost:4000
```

Si tu PostgreSQL es portable (carpetas `pgsql` y `pgsql-data` en tu usuario de Windows), enciéndelo así antes de `npm run dev`. Queda corriendo en segundo plano aunque cierres la ventana:

```powershell
Start-Process -WindowStyle Hidden "$HOME\pgsql\bin\pg_ctl.exe" -ArgumentList "-D `"$HOME\pgsql-data`" -l `"$HOME\pgsql-data\servidor.log`" start"
```

Con `EMAIL_MODE=console` los correos de confirmación no se envían: se imprimen en la terminal del backend. Copia de ahí el enlace `http://localhost:5173/verificar?token=...` para confirmar una cuenta nueva.

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173
```

### Cuentas de ejemplo

Después de `npm run db:seed` puedes entrar con cualquiera de estas cuentas. La contraseña de todas es `Uniruta2026` (solo para desarrollo local).

| Correo | Rol |
| --- | --- |
| lmartinez@utb.edu.co | Conductora (Turbaco), con una solicitud pendiente |
| aherrera@utb.edu.co | Conductor (Crespo) |
| crios@utb.edu.co | Conductora (Manga) |
| jperez@utb.edu.co | Pasajero, con un cupo confirmado y un viaje por calificar |
| vgomez@utb.edu.co | Pasajera, con una solicitud pendiente |
| mcastillo@utb.edu.co | Pasajero |

`npm run db:seed -- --carga` agrega 200 viajes extra para probar el rendimiento de la búsqueda (RNF-03).

## Pruebas

```bash
cd backend
npm test
```

Corre 56 pruebas (unitarias y de integración) contra la base `uniruta_test`, que se vacía en cada corrida. Incluye la prueba de concurrencia del último cupo: dos aceptaciones simultáneas y solo una gana (riesgo de la sección 9.10).

## Demo sin servidor

`npm run build:demo` genera en `frontend/dist-demo/` la misma aplicación con una API simulada que guarda los datos en el navegador. Sirve para mostrar el flujo sin backend; no reemplaza el despliegue real.

## Despliegue

### API y base de datos en Render

1. En Render: **New > Blueprint** y elige este repositorio. El archivo `render.yaml` crea la base PostgreSQL y el servicio `uniruta-api`.
2. Completa las variables que quedan pendientes:
   - `FRONTEND_URL`: la URL de Vercel (paso siguiente).
   - `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `EMAIL_FROM`: una cuenta de correo para enviar las confirmaciones. Con Gmail se usa una "contraseña de aplicación", no la contraseña normal.
3. Verifica que `https://<tu-servicio>.onrender.com/api/salud` responda `{"estado":"ok"}`.

Las tablas se crean solas al arrancar. En el plan gratuito el servicio se duerme tras unos minutos sin uso y la primera petición tarda unos 30 segundos.

### Aplicación web en Vercel

1. En Vercel: **Add New > Project**, elige el repositorio y pon `frontend` como **Root Directory**.
2. Agrega la variable `VITE_API_URL` con la URL de Render (sin `/api` al final).
3. Despliega. `vercel.json` hace que las rutas como `/viajes/3` funcionen al recargar.

## API

Todas las rutas, salvo las de `/api/auth`, exigen el encabezado `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/registro` | Crear cuenta (`nombre`, `correo`, `contrasena`, `telefono`) |
| POST | `/api/auth/verificar` | Confirmar correo (`token`) |
| POST | `/api/auth/reenviar-verificacion` | Reenviar correo de confirmación |
| POST | `/api/auth/login` | Iniciar sesión, devuelve `token` |
| GET / PATCH | `/api/usuarios/me` | Ver o editar el perfil propio (rol, placa, vehículo) |
| GET | `/api/usuarios/:id` | Perfil público con reputación |
| GET | `/api/viajes?origen=&destino=&fecha=&horaDesde=&horaHasta=` | Buscar viajes |
| POST | `/api/viajes` | Publicar viaje (solo conductores) |
| GET | `/api/viajes/mios` | Viajes publicados por mí |
| GET | `/api/viajes/historial` | Viajes pasados donde participé |
| GET | `/api/viajes/:id` | Detalle (incluye solicitudes si soy el conductor) |
| POST | `/api/viajes/:id/finalizar` | Terminar viaje (desde 30 min antes de la salida) |
| POST | `/api/viajes/:id/cancelar` | Cancelar viaje |
| POST | `/api/viajes/:id/solicitudes` | Pedir cupo |
| GET / POST | `/api/viajes/:id/calificaciones` | A quién puedo calificar / calificar |
| GET | `/api/solicitudes/mias` | Mis solicitudes como pasajero |
| GET | `/api/solicitudes/recibidas` | Solicitudes pendientes en mis viajes |
| POST | `/api/solicitudes/:id/aceptar` | Aceptar |
| POST | `/api/solicitudes/:id/rechazar` | Rechazar |
| POST | `/api/solicitudes/:id/cancelar` | Cancelar mi solicitud o cupo |
| GET | `/api/avisos` | Mis avisos y cuántos no he leído |
| POST | `/api/avisos/leer` | Marcar todos como leídos |
| GET | `/api/salud` | Estado del servidor y la base de datos |

## Decisiones técnicas

- **Cupos guardados en la tabla `viaje`** (sección 9.6). Para evitar sobreventa, aceptar una solicitud bloquea el viaje con `SELECT ... FOR UPDATE` y verifica y descuenta el cupo en la misma transacción. Cuando el viaje se llena, las solicitudes pendientes se rechazan solas y se avisa a esos pasajeros.
- **Tabla `aviso` agregada al modelo** para que las notificaciones funcionen dentro de la app aunque no haya un servidor de correo configurado. El aviso se guarda en la misma transacción que la acción que lo origina. Los avisos por correo se activan con `EMAIL_AVISOS=true`.
- **Columnas agregadas a `usuario`:** `verificado` y `token_verificacion` (confirmación de correo), `telefono` y `vehiculo`. Y a `viaje`: `aporte_sugerido`, `notas` y `estado` (`activo`, `finalizado`, `cancelado`).
- **Privacidad:** el celular y la placa del conductor solo los ven los pasajeros aceptados; el perfil público no muestra correo ni teléfono.
- **Hora de Colombia:** las fechas se guardan como `TIMESTAMPTZ` y la búsqueda por franja se hace en `America/Bogota`, sin depender de la zona horaria del servidor.
- **Seguridad:** contraseñas con bcrypt, consultas parametrizadas, `helmet`, límite de intentos en registro e inicio de sesión, mensajes de error genéricos en el login.
- **Aporte sugerido:** es solo informativo. El pago se acuerda por fuera de la plataforma (sección 8.2).
