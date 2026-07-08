-- ===================================================================
-- MIGRACION: NORMALIZAR RATINGS POR ANIO Y SEMANA
-- ===================================================================
-- Fecha: 2026-07-07
-- Descripcion: Agrega anio y numero de semana al rating semanal,
--              recalcula rangos desde el primer lunes del anio y
--              evita duplicados por conductor/semana sin borrar datos.
-- ===================================================================

ALTER TABLE public.conductor_ratings_semanales
ADD COLUMN IF NOT EXISTS rating_year INTEGER;

ALTER TABLE public.conductor_ratings_semanales
ADD COLUMN IF NOT EXISTS week_number INTEGER;

WITH rating_source AS (
  SELECT
    id,
    COALESCE(semana_inicio, fecha_registro) AS reference_date
  FROM public.conductor_ratings_semanales
  WHERE deleted_at IS NULL
), normalized_base AS (
  SELECT
    id,
    reference_date,
    CASE
      WHEN reference_date < (
        make_date(EXTRACT(YEAR FROM reference_date)::INTEGER, 1, 1) +
        (((8 - EXTRACT(ISODOW FROM make_date(EXTRACT(YEAR FROM reference_date)::INTEGER, 1, 1))::INTEGER) % 7)) * INTERVAL '1 day'
      )
      THEN EXTRACT(YEAR FROM reference_date)::INTEGER - 1
      ELSE EXTRACT(YEAR FROM reference_date)::INTEGER
    END AS normalized_year
  FROM rating_source
), normalized_weeks AS (
  SELECT
    id,
    normalized_year,
    (
      make_date(normalized_year, 1, 1) +
      (((8 - EXTRACT(ISODOW FROM make_date(normalized_year, 1, 1))::INTEGER) % 7)) * INTERVAL '1 day'
    )::DATE AS first_monday,
    (
      make_date(normalized_year + 1, 1, 1) +
      (((8 - EXTRACT(ISODOW FROM make_date(normalized_year + 1, 1, 1))::INTEGER) % 7)) * INTERVAL '1 day'
    )::DATE AS next_first_monday,
    reference_date
  FROM normalized_base
), normalized_values AS (
  SELECT
    id,
    normalized_year AS rating_year,
    LEAST(
      52,
      GREATEST(
        1,
        FLOOR((reference_date - first_monday) / 7.0)::INTEGER + 1
      )
    ) AS week_number,
    first_monday,
    next_first_monday
  FROM normalized_weeks
)
UPDATE public.conductor_ratings_semanales target
SET
  rating_year = values.rating_year,
  week_number = values.week_number,
  semana_inicio = (
    values.first_monday + ((values.week_number - 1) * INTERVAL '7 day')
  )::DATE,
  semana_fin = CASE
    WHEN values.week_number = 52 THEN (values.next_first_monday - INTERVAL '1 day')::DATE
    ELSE (
      values.first_monday + ((values.week_number - 1) * INTERVAL '7 day') + INTERVAL '6 day'
    )::DATE
  END
FROM normalized_values values
WHERE target.id = values.id;

UPDATE public.conductor_ratings_semanales
SET fecha_registro = COALESCE(fecha_registro, CURRENT_DATE)
WHERE fecha_registro IS NULL;

ALTER TABLE public.conductor_ratings_semanales
ALTER COLUMN rating_year SET NOT NULL;

ALTER TABLE public.conductor_ratings_semanales
ALTER COLUMN week_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conductor_ratings_semanales_driver_week
  ON public.conductor_ratings_semanales(conductor_id, rating_year DESC, week_number DESC)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conductor_ratings_semanales_driver_week
  ON public.conductor_ratings_semanales(conductor_id, rating_year, week_number)
  WHERE deleted_at IS NULL;
