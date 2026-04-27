-- ===================================================================
-- MIGRACIÓN: ALMACENAR ARCHIVOS DE DOCUMENTOS EN POSTGRESQL
-- ===================================================================
-- Fecha: 2026-04-24
-- Descripción: Guarda cada archivo de documento como un registro binario
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.vehiculo_documento_archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_documento_id UUID NOT NULL REFERENCES public.vehiculo_documentos(id) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(120) NOT NULL,
  tamaño_bytes INTEGER NOT NULL,
  archivo_data BYTEA NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_documento_archivos_documento_id
  ON public.vehiculo_documento_archivos(vehiculo_documento_id);

CREATE INDEX IF NOT EXISTS idx_vehiculo_documento_archivos_orden
  ON public.vehiculo_documento_archivos(vehiculo_documento_id, orden);

COMMENT ON TABLE public.vehiculo_documento_archivos IS
'Archivos binarios asociados a cada documento vehicular';

COMMENT ON COLUMN public.vehiculo_documento_archivos.archivo_data IS
'Contenido binario del archivo almacenado directamente en PostgreSQL';
