-- MIGRACIÓN: Agregar campo estado a tabla vehiculos
-- Fecha: 2026-04-10
-- Descripción: Agrega el campo estado para RF1 con valores: activo, inactivo, en_taller

-- Agregar columna estado a vehiculos si no existe
ALTER TABLE IF EXISTS public.vehiculos
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo';

-- Actualizar vehículos con estado NULL o inválido
UPDATE public.vehiculos 
SET estado = 'activo' 
WHERE estado IS NULL OR estado NOT IN ('activo', 'inactivo', 'en_taller');

-- Agregar índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_vehiculos_estado ON public.vehiculos(estado);

-- Actualizar constraint existente si ya existe (DROP si existe, CREATE nueva)
ALTER TABLE public.vehiculos
DROP CONSTRAINT IF EXISTS vehiculos_estado_check;

-- Agregar nuevo constraint para validar valores válidos
ALTER TABLE public.vehiculos
ADD CONSTRAINT vehiculos_estado_check 
CHECK (estado IN ('activo', 'inactivo', 'en_mantenimiento'));
