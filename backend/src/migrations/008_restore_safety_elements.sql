-- MIGRACIÓN: Restaurar elementos de seguridad eliminados incorrectamente
-- Fecha: 2026-04-14
-- Descripción: Fix para elementos que fueron marcados como deleted durante migraciones anteriores

-- Restaurar todos los elementos de seguridad (poner deleted_at en NULL)
UPDATE public.vehiculo_elementos_seguridad 
SET deleted_at = NULL 
WHERE deleted_at IS NOT NULL;

-- Verificar que se restauraron
-- SELECT COUNT(*) as total_activos FROM vehiculo_elementos_seguridad WHERE deleted_at IS NULL;
