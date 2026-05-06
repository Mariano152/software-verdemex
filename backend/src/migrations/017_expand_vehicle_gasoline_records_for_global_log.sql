-- ===================================================================
-- MIGRACION: EXPANDIR HISTORIAL DE GASOLINA PARA BITACORA GLOBAL
-- ===================================================================
-- Fecha: 2026-05-05
-- Descripcion: Agrega campos operativos para registrar cargas globales
--              de gasolina/diesel por vehiculo sin afectar el modulo
--              individual existente.
-- ===================================================================

ALTER TABLE public.vehiculo_gasolina_registros
  ADD COLUMN IF NOT EXISTS factura VARCHAR(120),
  ADD COLUMN IF NOT EXISTS hora_carga TIME,
  ADD COLUMN IF NOT EXISTS kilometraje_actual NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS kilometraje_anterior NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS kilometros_recorridos NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS m3_enviados NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS operador VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primera_carga BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS placa_snapshot VARCHAR(20),
  ADD COLUMN IF NOT EXISTS descripcion_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS numero_economico_snapshot VARCHAR(120);

ALTER TABLE public.vehiculo_gasolina_registros
  ADD CONSTRAINT chk_vehiculo_gasolina_kilometraje_actual
  CHECK (kilometraje_actual IS NULL OR kilometraje_actual >= 0);

ALTER TABLE public.vehiculo_gasolina_registros
  ADD CONSTRAINT chk_vehiculo_gasolina_kilometraje_anterior
  CHECK (kilometraje_anterior IS NULL OR kilometraje_anterior >= 0);

ALTER TABLE public.vehiculo_gasolina_registros
  ADD CONSTRAINT chk_vehiculo_gasolina_km_recorridos
  CHECK (kilometros_recorridos IS NULL OR kilometros_recorridos >= 0);

ALTER TABLE public.vehiculo_gasolina_registros
  ADD CONSTRAINT chk_vehiculo_gasolina_m3_enviados
  CHECK (m3_enviados IS NULL OR m3_enviados >= 0);

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_registros_fecha_hora
  ON public.vehiculo_gasolina_registros(fecha_carga DESC, hora_carga DESC);
