-- ===================================================================
-- MIGRACION: NORMALIZAR TIPO DE COMBUSTIBLE EN GASOLINA
-- ===================================================================
-- Fecha: 2026-05-15
-- Descripcion: Estandariza el tipo de combustible a diesel, magma o
--              premium para formularios, reportes y KPIs.
-- ===================================================================

UPDATE public.vehiculo_gasolina_registros
SET tipo_combustible = CASE
  WHEN LOWER(TRIM(COALESCE(tipo_combustible, ''))) = 'diesel' THEN 'diesel'
  WHEN LOWER(TRIM(COALESCE(tipo_combustible, ''))) = 'premium' THEN 'premium'
  WHEN LOWER(TRIM(COALESCE(tipo_combustible, ''))) IN ('magma', 'magna', 'gasolina', 'regular') THEN 'magma'
  ELSE 'magma'
END;

ALTER TABLE public.vehiculo_gasolina_registros
  ALTER COLUMN tipo_combustible SET DEFAULT 'magma';

ALTER TABLE public.vehiculo_gasolina_registros
  DROP CONSTRAINT IF EXISTS chk_vehiculo_gasolina_tipo_combustible;

ALTER TABLE public.vehiculo_gasolina_registros
  ADD CONSTRAINT chk_vehiculo_gasolina_tipo_combustible
  CHECK (tipo_combustible IN ('diesel', 'magma', 'premium'));

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_registros_tipo_combustible
  ON public.vehiculo_gasolina_registros(tipo_combustible)
  WHERE deleted_at IS NULL;
