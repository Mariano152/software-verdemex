-- ===================================================================
-- MIGRACION: MODULO BASE DE CONDUCTORES
-- ===================================================================
-- Fecha: 2026-07-01
-- Descripcion: Crea la tabla principal para el catalogo de conductores
--              y sus datos operativos iniciales.
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.conductores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(180) NOT NULL,
  telefono VARCHAR(40) NOT NULL,
  numero_seguro_social VARCHAR(40) NOT NULL,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  descripcion TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT chk_conductores_rating
    CHECK (rating >= 0 AND rating <= 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conductores_nss_unique
  ON public.conductores(numero_seguro_social)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conductores_nombre
  ON public.conductores(LOWER(nombre))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conductores_telefono
  ON public.conductores(telefono)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conductores_rating
  ON public.conductores(rating)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.conductores IS
'Catalogo base de conductores con informacion general y rating operativo';
