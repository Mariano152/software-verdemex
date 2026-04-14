-- Migración: Agregar columna imagen_url a tabla vehiculos
ALTER TABLE public.vehiculos
ADD COLUMN IF NOT EXISTS imagen_url TEXT NULL;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_vehiculos_imagen_url ON public.vehiculos(imagen_url);
