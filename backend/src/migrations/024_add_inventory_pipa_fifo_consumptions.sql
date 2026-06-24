-- ===================================================================
-- MIGRACION: CONSUMOS FIFO DE INVENTARIO DE PIPAS
-- ===================================================================
-- Fecha: 2026-06-23
-- Descripcion: Registra de que lote de recarga sale cada carga de
--              gasolina desde pipa para costear por FIFO y conservar
--              trazabilidad con soft delete.
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.inventario_pipa_consumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipa_id UUID NOT NULL REFERENCES public.inventario_pipas(id),
  inventario_pipa_registro_id UUID NOT NULL REFERENCES public.inventario_pipa_registros(id),
  vehiculo_gasolina_registro_id UUID NOT NULL REFERENCES public.vehiculo_gasolina_registros(id),
  fecha_consumo DATE NOT NULL,
  litros_consumidos NUMERIC(12,2) NOT NULL,
  costo_unitario NUMERIC(12,4) NOT NULL,
  costo_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

ALTER TABLE public.inventario_pipa_consumos
  DROP CONSTRAINT IF EXISTS chk_inventario_pipa_consumos_litros;

ALTER TABLE public.inventario_pipa_consumos
  ADD CONSTRAINT chk_inventario_pipa_consumos_litros
  CHECK (litros_consumidos > 0);

ALTER TABLE public.inventario_pipa_consumos
  DROP CONSTRAINT IF EXISTS chk_inventario_pipa_consumos_costos;

ALTER TABLE public.inventario_pipa_consumos
  ADD CONSTRAINT chk_inventario_pipa_consumos_costos
  CHECK (costo_unitario >= 0 AND costo_total >= 0);

CREATE INDEX IF NOT EXISTS idx_inventario_pipa_consumos_pipa
  ON public.inventario_pipa_consumos(pipa_id, fecha_consumo, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_pipa_consumos_lote
  ON public.inventario_pipa_consumos(inventario_pipa_registro_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_pipa_consumos_gasolina
  ON public.inventario_pipa_consumos(vehiculo_gasolina_registro_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS inventario_pipa_consumos_update_timestamp
  ON public.inventario_pipa_consumos;

CREATE TRIGGER inventario_pipa_consumos_update_timestamp
  BEFORE UPDATE ON public.inventario_pipa_consumos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
