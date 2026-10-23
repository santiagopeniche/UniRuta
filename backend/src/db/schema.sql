-- Esquema de la base de datos de Uniruta UTB (PostgreSQL)
-- Corresponde al modelo entidad-relación de la sección 9.6 del documento,
-- con la tabla AVISO agregada para las notificaciones dentro de la aplicación.

CREATE TABLE IF NOT EXISTS usuario (
  id                  SERIAL PRIMARY KEY,
  nombre              VARCHAR(100) NOT NULL,
  correo              VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash     VARCHAR(100) NOT NULL,
  telefono            VARCHAR(20),
  rol                 VARCHAR(10)  NOT NULL DEFAULT 'pasajero' CHECK (rol IN ('pasajero', 'conductor')),
  placa               VARCHAR(10),
  vehiculo            VARCHAR(80),
  verificado          BOOLEAN      NOT NULL DEFAULT FALSE,
  token_verificacion  VARCHAR(64),
  creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- un conductor siempre debe tener placa registrada
  CONSTRAINT conductor_con_placa CHECK (rol <> 'conductor' OR placa IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS viaje (
  id                  SERIAL PRIMARY KEY,
  conductor_id        INTEGER      NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  origen              VARCHAR(120) NOT NULL,
  destino             VARCHAR(120) NOT NULL,
  punto_encuentro     VARCHAR(160) NOT NULL,
  fecha_hora          TIMESTAMPTZ  NOT NULL,
  cupos_totales       SMALLINT     NOT NULL CHECK (cupos_totales BETWEEN 1 AND 6),
  -- Se guarda directamente (decisión de la sección 9.6) para que la búsqueda sea rápida
  cupos_disponibles   SMALLINT     NOT NULL,
  aporte_sugerido     INTEGER      CHECK (aporte_sugerido IS NULL OR aporte_sugerido >= 0),
  notas               VARCHAR(300),
  estado              VARCHAR(12)  NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado', 'cancelado')),
  creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT cupos_validos CHECK (cupos_disponibles BETWEEN 0 AND cupos_totales)
);

CREATE INDEX IF NOT EXISTS idx_viaje_busqueda ON viaje (estado, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_viaje_conductor ON viaje (conductor_id);

CREATE TABLE IF NOT EXISTS solicitud (
  id                  SERIAL PRIMARY KEY,
  viaje_id            INTEGER      NOT NULL REFERENCES viaje(id) ON DELETE CASCADE,
  pasajero_id         INTEGER      NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  estado              VARCHAR(10)  NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada')),
  mensaje             VARCHAR(200),
  creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  respondido_en       TIMESTAMPTZ,
  -- un pasajero solo puede tener una solicitud por viaje
  CONSTRAINT solicitud_unica UNIQUE (viaje_id, pasajero_id)
);

CREATE INDEX IF NOT EXISTS idx_solicitud_pasajero ON solicitud (pasajero_id);

CREATE TABLE IF NOT EXISTS calificacion (
  id                  SERIAL PRIMARY KEY,
  viaje_id            INTEGER      NOT NULL REFERENCES viaje(id) ON DELETE CASCADE,
  autor_id            INTEGER      NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  calificado_id       INTEGER      NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  puntaje             SMALLINT     NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  comentario          VARCHAR(300),
  creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- cada usuario califica una sola vez a cada compañero por viaje (RF-07)
  CONSTRAINT calificacion_unica UNIQUE (viaje_id, autor_id, calificado_id),
  CONSTRAINT no_autocalificarse CHECK (autor_id <> calificado_id)
);

CREATE INDEX IF NOT EXISTS idx_calificacion_calificado ON calificacion (calificado_id);

CREATE TABLE IF NOT EXISTS aviso (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER      NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo                VARCHAR(30)  NOT NULL,
  mensaje             VARCHAR(300) NOT NULL,
  viaje_id            INTEGER      REFERENCES viaje(id) ON DELETE CASCADE,
  leido               BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aviso_usuario ON aviso (usuario_id, leido);
