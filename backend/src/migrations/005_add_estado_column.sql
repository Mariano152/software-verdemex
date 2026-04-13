-- MIGRACIÓN: Agregar campo estado a tabla vehiculos
-- Fecha: 2026-04-10
-- Descripción: Agrega el campo estado para RF1 con valores: activo, inactivo, mantenimiento

-- Agregar columna estado a vehiculos si no existe
ALTER TABLE IF EXISTS public.vehiculos
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo';

-- Agregar índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_vehiculos_estado ON public.vehiculos(estado);

-- Agregar constraint para validar valores válidos
ALTER TABLE public.vehiculos
ADD CONSTRAINT vehiculos_estado_check 
CHECK (estado IN ('activo', 'inactivo', 'mantenimiento'));
