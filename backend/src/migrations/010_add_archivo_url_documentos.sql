-- ===================================================================
-- MIGRACIÓN: AGREGAR COLUMNAS PARA ARCHIVOS A vehiculo_documentos
-- ===================================================================
-- Fecha: 2026-04-20
-- Descripción: Agrega soporte para guardar archivos en documentos
-- ===================================================================

-- TABLA: vehiculo_documentos
-- Agregar columnas para guardar archivos locales
ALTER TABLE IF EXISTS public.vehiculo_documentos
ADD COLUMN IF NOT EXISTS archivo_url VARCHAR(500);

ALTER TABLE IF EXISTS public.vehiculo_documentos
ADD COLUMN IF NOT EXISTS archivos_json TEXT;

-- Agregar índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_vehiculo_documentos_archivo_url 
ON public.vehiculo_documentos(archivo_url);

-- Comentarios explicativos
COMMENT ON COLUMN public.vehiculo_documentos.archivo_url IS 
'URL del archivo principal guardado en Cloudinary';


COMMENT ON COLUMN public.vehiculo_documentos.archivos_json IS 
'JSON con información de todos los archivos adjuntos (nombre_original, ruta, tamaño, etc)';

