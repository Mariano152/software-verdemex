-- ===================================================================
-- MIGRACION: CALIFICACIONES DECIMALES EN RATINGS DE CONDUCTORES
-- ===================================================================
-- Fecha: 2026-07-07
-- Descripcion: Permite calificaciones decimales mayores a 0 y hasta 10
--              sin borrar informacion existente.
-- ===================================================================

ALTER TABLE public.conductor_ratings_semanales
ALTER COLUMN calificacion TYPE NUMERIC(4,1)
USING ROUND(calificacion::NUMERIC, 1);

ALTER TABLE public.conductor_ratings_semanales
DROP CONSTRAINT IF EXISTS chk_conductor_ratings_semanales_calificacion;

ALTER TABLE public.conductor_ratings_semanales
ADD CONSTRAINT chk_conductor_ratings_semanales_calificacion
CHECK (calificacion > 0 AND calificacion <= 10);
