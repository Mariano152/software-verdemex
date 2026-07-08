-- ===================================================================
-- MIGRACION: HISTORIAL Y RATING SEMANAL DE CONDUCTORES
-- ===================================================================
-- Fecha: 2026-07-02
-- Descripcion: Agrega modulo de historial libre y evaluaciones
--              semanales para conductores con adjuntos opcionales.
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.conductor_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES public.conductores(id) ON DELETE CASCADE,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_conductor_historial_conductor_id
  ON public.conductor_historial(conductor_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.conductor_historial_archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_historial_id UUID NOT NULL REFERENCES public.conductor_historial(id) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(120) NULL,
  tamano_bytes BIGINT NULL,
  archivo_data BYTEA NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_conductor_historial_archivos_historial_id
  ON public.conductor_historial_archivos(conductor_historial_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.conductor_ratings_semanales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES public.conductores(id) ON DELETE CASCADE,
  fecha_registro DATE NOT NULL,
  semana_inicio DATE NOT NULL,
  semana_fin DATE NOT NULL,
  calificacion INTEGER NOT NULL,
  descripcion TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT chk_conductor_ratings_semanales_calificacion
    CHECK (calificacion BETWEEN 1 AND 10),
  CONSTRAINT chk_conductor_ratings_semanales_fechas
    CHECK (semana_inicio <= semana_fin)
);

CREATE INDEX IF NOT EXISTS idx_conductor_ratings_semanales_conductor_id
  ON public.conductor_ratings_semanales(conductor_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.conductor_rating_archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_rating_id UUID NOT NULL REFERENCES public.conductor_ratings_semanales(id) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(120) NULL,
  tamano_bytes BIGINT NULL,
  archivo_data BYTEA NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_conductor_rating_archivos_rating_id
  ON public.conductor_rating_archivos(conductor_rating_id)
  WHERE deleted_at IS NULL;
