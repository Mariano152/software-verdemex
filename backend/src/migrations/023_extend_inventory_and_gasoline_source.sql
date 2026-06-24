-- ===================================================================
-- MIGRACION: EXTENDER INVENTARIO DE PIPAS Y ORIGEN DE CARGA DE GASOLINA
-- ===================================================================
-- Fecha: 2026-06-22
-- Descripcion: Agrega proveedor, factura y documento al historial de
--              recargas de pipa. Tambien registra si una carga de
--              gasolina proviene de gasolinera o de pipa.
-- ===================================================================

ALTER TABLE IF EXISTS public.inventario_pipa_registros
  ADD COLUMN IF NOT EXISTS factura VARCHAR(120);

ALTER TABLE IF EXISTS public.inventario_pipa_registros
  ADD COLUMN IF NOT EXISTS proveedor VARCHAR(255);

ALTER TABLE IF EXISTS public.inventario_pipa_registros
  ADD COLUMN IF NOT EXISTS documento_nombre_original VARCHAR(255);

ALTER TABLE IF EXISTS public.inventario_pipa_registros
  ADD COLUMN IF NOT EXISTS documento_tipo_mime VARCHAR(120);

ALTER TABLE IF EXISTS public.inventario_pipa_registros
  ADD COLUMN IF NOT EXISTS documento_tamano_bytes BIGINT;

ALTER TABLE IF EXISTS public.inventario_pipa_registros
  ADD COLUMN IF NOT EXISTS documento_data BYTEA;

ALTER TABLE IF EXISTS public.vehiculo_gasolina_registros
  ADD COLUMN IF NOT EXISTS origen_carga VARCHAR(20) NOT NULL DEFAULT 'gasolinera';

ALTER TABLE IF EXISTS public.vehiculo_gasolina_registros
  ADD COLUMN IF NOT EXISTS inventario_pipa_registro_id UUID;

ALTER TABLE IF EXISTS public.vehiculo_gasolina_registros
  ADD COLUMN IF NOT EXISTS pipa_nombre_snapshot VARCHAR(150);

ALTER TABLE IF EXISTS public.vehiculo_gasolina_registros
  ADD COLUMN IF NOT EXISTS precio_litro_referencia NUMERIC(12,4);

ALTER TABLE IF EXISTS public.vehiculo_gasolina_registros
  DROP CONSTRAINT IF EXISTS chk_vehiculo_gasolina_origen_carga;

ALTER TABLE IF EXISTS public.vehiculo_gasolina_registros
  ADD CONSTRAINT chk_vehiculo_gasolina_origen_carga
  CHECK (origen_carga IN ('gasolinera', 'pipa'));

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_origen_carga
  ON public.vehiculo_gasolina_registros(origen_carga)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_pipa_registro
  ON public.vehiculo_gasolina_registros(inventario_pipa_registro_id)
  WHERE deleted_at IS NULL;
