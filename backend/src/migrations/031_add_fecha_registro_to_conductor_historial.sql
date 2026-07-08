-- ===================================================================
-- MIGRACION: FECHA DE REGISTRO EN HISTORIAL DE CONDUCTORES
-- ===================================================================
-- Fecha: 2026-07-05
-- Descripcion: Agrega una fecha funcional al historial del conductor
--              para registrar cuando ocurrio el evento.
-- ===================================================================

ALTER TABLE public.conductor_historial
ADD COLUMN IF NOT EXISTS fecha_registro DATE;

UPDATE public.conductor_historial
SET fecha_registro = COALESCE(created_at::date, CURRENT_DATE)
WHERE fecha_registro IS NULL;

ALTER TABLE public.conductor_historial
ALTER COLUMN fecha_registro SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conductor_historial_fecha_registro
  ON public.conductor_historial(conductor_id, fecha_registro DESC)
  WHERE deleted_at IS NULL;
