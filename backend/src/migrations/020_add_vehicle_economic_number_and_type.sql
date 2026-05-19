-- Agrega numero economico y tipo de carro a vehiculos

ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS numero_economico VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tipo_carro VARCHAR(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehiculos_tipo_carro_check'
  ) THEN
    ALTER TABLE vehiculos
      ADD CONSTRAINT vehiculos_tipo_carro_check
      CHECK (
        tipo_carro IS NULL
        OR tipo_carro IN (
          'Torton',
          'Tracto',
          'Remolque',
          'Rabon',
          'Pipa',
          'Gondola',
          'Plataforma'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS vehiculos_numero_economico_unique_idx
  ON vehiculos (numero_economico)
  WHERE deleted_at IS NULL AND numero_economico IS NOT NULL;
