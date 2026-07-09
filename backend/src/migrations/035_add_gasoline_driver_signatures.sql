-- ===================================================================
-- MIGRACION: ASIGNACION DE CONDUCTOR Y FIRMAS EN GASOLINA
-- ===================================================================
-- Fecha: 2026-07-08
-- Descripcion: Permite asignar una carga de gasolina a un conductor,
--              llevar el estatus de firma y almacenar la evidencia
--              fotografica enviada desde el portal del conductor.
-- ===================================================================

ALTER TABLE public.vehiculo_gasolina_registros
ADD COLUMN IF NOT EXISTS conductor_id UUID NULL REFERENCES public.conductores(id) ON DELETE SET NULL;

ALTER TABLE public.vehiculo_gasolina_registros
ADD COLUMN IF NOT EXISTS conductor_nombre_snapshot VARCHAR(255);

ALTER TABLE public.vehiculo_gasolina_registros
ADD COLUMN IF NOT EXISTS conductor_imagen_url_snapshot TEXT;

ALTER TABLE public.vehiculo_gasolina_registros
ADD COLUMN IF NOT EXISTS firma_estatus VARCHAR(20) NOT NULL DEFAULT 'sin_asignar';

ALTER TABLE public.vehiculo_gasolina_registros
ADD COLUMN IF NOT EXISTS firma_fecha TIMESTAMPTZ NULL;

ALTER TABLE public.vehiculo_gasolina_registros
ADD COLUMN IF NOT EXISTS firma_observaciones TEXT NULL;

UPDATE public.vehiculo_gasolina_registros
SET firma_estatus = CASE
  WHEN conductor_id IS NULL THEN 'sin_asignar'
  ELSE 'pendiente'
END
WHERE firma_estatus IS NULL
   OR firma_estatus NOT IN ('sin_asignar', 'pendiente', 'firmado');

ALTER TABLE public.vehiculo_gasolina_registros
DROP CONSTRAINT IF EXISTS chk_vehiculo_gasolina_firma_estatus;

ALTER TABLE public.vehiculo_gasolina_registros
ADD CONSTRAINT chk_vehiculo_gasolina_firma_estatus
CHECK (firma_estatus IN ('sin_asignar', 'pendiente', 'firmado'));

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_conductor_id
  ON public.vehiculo_gasolina_registros(conductor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_firma_estatus
  ON public.vehiculo_gasolina_registros(firma_estatus)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.vehiculo_gasolina_firma_archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_gasolina_registro_id UUID NOT NULL REFERENCES public.vehiculo_gasolina_registros(id) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(150),
  tamano_bytes BIGINT,
  archivo_data BYTEA NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_firma_archivos_registro_id
  ON public.vehiculo_gasolina_firma_archivos(vehiculo_gasolina_registro_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_firma_archivos_orden
  ON public.vehiculo_gasolina_firma_archivos(vehiculo_gasolina_registro_id, orden)
  WHERE deleted_at IS NULL;
