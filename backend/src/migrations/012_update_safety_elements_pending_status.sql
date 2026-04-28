-- MIGRACION: Actualizar estatus de elementos de seguridad para usar pendiente
-- Fecha: 2026-04-26
-- Descripcion: Reemplaza "incorrecto" por "pendiente" y actualiza el constraint

-- Convertir datos existentes
UPDATE public.vehiculo_elementos_seguridad
SET estatus = 'pendiente'
WHERE estatus = 'incorrecto';

-- Actualizar constraint
ALTER TABLE public.vehiculo_elementos_seguridad
DROP CONSTRAINT IF EXISTS vehiculo_elementos_seguridad_estatus_check;

ALTER TABLE public.vehiculo_elementos_seguridad
ADD CONSTRAINT vehiculo_elementos_seguridad_estatus_check
CHECK (estatus IN ('correcto', 'pendiente', 'no_aplica'));
