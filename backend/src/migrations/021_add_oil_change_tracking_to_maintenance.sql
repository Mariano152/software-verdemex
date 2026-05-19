ALTER TABLE vehiculo_mantenimientos
  ADD COLUMN IF NOT EXISTS es_cambio_aceite BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kilometraje_base_aceite NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS kilometraje_base_fuente VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehiculo_mantenimientos_kilometraje_base_aceite_check'
  ) THEN
    ALTER TABLE vehiculo_mantenimientos
      ADD CONSTRAINT vehiculo_mantenimientos_kilometraje_base_aceite_check
      CHECK (kilometraje_base_aceite IS NULL OR kilometraje_base_aceite >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehiculo_mantenimientos_kilometraje_base_fuente_check'
  ) THEN
    ALTER TABLE vehiculo_mantenimientos
      ADD CONSTRAINT vehiculo_mantenimientos_kilometraje_base_fuente_check
      CHECK (
        kilometraje_base_fuente IS NULL
        OR kilometraje_base_fuente IN ('gasolina', 'manual')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehiculo_mantenimientos_aceite_fecha
  ON vehiculo_mantenimientos (vehiculo_id, es_cambio_aceite, fecha_servicio DESC)
  WHERE deleted_at IS NULL;
