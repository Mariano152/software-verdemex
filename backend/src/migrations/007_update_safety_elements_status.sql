-- MIGRACIÓN: Actualizar valores permitidos para estatus de elementos de seguridad
-- Fecha: 2026-04-10
-- Descripción: Cambia los valores permitidos de (si, no, no_aplica) a (correcto, incorrecto, no_aplica)

-- PRIMERO: Actualizar valores existentes en la tabla (ambos soft-deleted y activos)
UPDATE public.vehiculo_elementos_seguridad SET estatus = 'correcto' WHERE estatus = 'si';
UPDATE public.vehiculo_elementos_seguridad SET estatus = 'incorrecto' WHERE estatus = 'no';

-- SEGUNDO: Eliminar constraint antigua (si existe)
ALTER TABLE public.vehiculo_elementos_seguridad
DROP CONSTRAINT IF EXISTS vehiculo_elementos_seguridad_estatus_check;

-- TERCERO: Agregar nuevo constraint con valores actualizados
ALTER TABLE public.vehiculo_elementos_seguridad
ADD CONSTRAINT vehiculo_elementos_seguridad_estatus_check 
CHECK(estatus IN ('correcto', 'incorrecto', 'no_aplica'));


