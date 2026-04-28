-- ===================================================================
-- MIGRACION: HISTORIAL DE CAMBIOS DEL VEHICULO
-- ===================================================================
-- Fecha: 2026-04-28
-- Descripcion: Bitacora de cambios por modulo para cada vehiculo
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.vehiculo_historial_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  usuario_id INT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  modulo VARCHAR(60) NOT NULL,
  accion VARCHAR(60) NOT NULL,
  entidad_tipo VARCHAR(80),
  entidad_id VARCHAR(120),
  descripcion TEXT NOT NULL,
  detalles_json JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_historial_cambios_vehiculo_id
  ON public.vehiculo_historial_cambios(vehiculo_id);

CREATE INDEX IF NOT EXISTS idx_vehiculo_historial_cambios_fecha
  ON public.vehiculo_historial_cambios(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehiculo_historial_cambios_vehiculo_fecha
  ON public.vehiculo_historial_cambios(vehiculo_id, created_at DESC);

COMMENT ON TABLE public.vehiculo_historial_cambios IS
'Bitacora de cambios realizados sobre documentos, fotos, gasolina y mantenimiento de cada vehiculo';
