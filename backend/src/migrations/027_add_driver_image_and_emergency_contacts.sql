-- ===================================================================
-- MIGRACION: IMAGEN Y CONTACTOS DE EMERGENCIA DE CONDUCTORES
-- ===================================================================
-- Fecha: 2026-07-01
-- Descripcion: Agrega imagen opcional al conductor y crea la tabla
--              de contactos de emergencia sin tocar otros modulos.
-- ===================================================================

ALTER TABLE public.conductores
  ADD COLUMN IF NOT EXISTS imagen_url TEXT NULL;

COMMENT ON COLUMN public.conductores.imagen_url IS
'URL de la fotografia principal del conductor';

CREATE TABLE IF NOT EXISTS public.conductor_contactos_emergencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES public.conductores(id) ON DELETE CASCADE,
  nombre VARCHAR(180) NOT NULL,
  parentesco VARCHAR(120) NOT NULL,
  numero_telefono VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_conductor_contactos_emergencia_conductor_id
  ON public.conductor_contactos_emergencia(conductor_id)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.conductor_contactos_emergencia IS
'Contactos de emergencia asociados a cada conductor';
