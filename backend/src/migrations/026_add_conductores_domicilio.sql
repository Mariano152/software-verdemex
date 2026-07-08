-- ===================================================================
-- MIGRACION: AGREGAR DOMICILIO A CONDUCTORES
-- ===================================================================
-- Fecha: 2026-07-01
-- Descripcion: Agrega el campo domicilio al catalogo de conductores
--              sin modificar otras tablas.
-- ===================================================================

ALTER TABLE public.conductores
  ADD COLUMN IF NOT EXISTS domicilio TEXT NULL;

COMMENT ON COLUMN public.conductores.domicilio IS
'Domicilio principal del conductor';
