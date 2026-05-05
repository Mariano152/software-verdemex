-- MIGRACION 016
-- Permite marcar documentos sin vigencia aplicable.

ALTER TABLE IF EXISTS public.vehiculo_documentos
  DROP CONSTRAINT IF EXISTS vehiculo_documentos_estatus_check;

ALTER TABLE IF EXISTS public.vehiculo_documentos
  ADD CONSTRAINT vehiculo_documentos_estatus_check
  CHECK (estatus IN ('vigente', 'vencido', 'cancelado', 'en_revision', 'por_vencer', 'no_aplica'));
