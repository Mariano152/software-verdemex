-- ===================================================================
-- MIGRACION: HISTORIAL DE MANTENIMIENTO VEHICULAR
-- ===================================================================
-- Fecha: 2026-04-27
-- Descripcion: Registra servicios de mantenimiento con adjuntos y soft delete
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.vehiculo_mantenimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  titulo VARCHAR(255) NOT NULL,
  tipo_mantenimiento VARCHAR(120) NOT NULL,
  fecha_servicio DATE NOT NULL,
  costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  proveedor VARCHAR(255),
  descripcion TEXT,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_mantenimientos_vehiculo_id
  ON public.vehiculo_mantenimientos(vehiculo_id);

CREATE INDEX IF NOT EXISTS idx_vehiculo_mantenimientos_fecha_servicio
  ON public.vehiculo_mantenimientos(fecha_servicio DESC);

CREATE INDEX IF NOT EXISTS idx_vehiculo_mantenimientos_activos
  ON public.vehiculo_mantenimientos(vehiculo_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.vehiculo_mantenimiento_archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_mantenimiento_id UUID NOT NULL REFERENCES public.vehiculo_mantenimientos(id) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(120) NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  archivo_data BYTEA NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_mantenimiento_archivos_mantenimiento_id
  ON public.vehiculo_mantenimiento_archivos(vehiculo_mantenimiento_id);

CREATE INDEX IF NOT EXISTS idx_vehiculo_mantenimiento_archivos_orden
  ON public.vehiculo_mantenimiento_archivos(vehiculo_mantenimiento_id, orden);

COMMENT ON TABLE public.vehiculo_mantenimientos IS
'Historial de servicios de mantenimiento realizados a cada vehiculo';

COMMENT ON TABLE public.vehiculo_mantenimiento_archivos IS
'Archivos adjuntos asociados a cada registro de mantenimiento vehicular';
