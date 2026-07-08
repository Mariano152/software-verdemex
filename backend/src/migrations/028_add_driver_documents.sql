-- ===================================================================
-- MIGRACION: DOCUMENTACION DE CONDUCTORES
-- ===================================================================
-- Fecha: 2026-07-02
-- Descripcion: Crea el modulo de documentos para conductores con
--              vigencia opcional y adjuntos.
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.conductor_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES public.conductores(id) ON DELETE CASCADE,
  tipo_documento_id INTEGER NOT NULL,
  vigencia DATE NULL,
  observaciones TEXT NULL,
  estatus VARCHAR(20) NOT NULL DEFAULT 'vigente',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT chk_conductor_documentos_tipo
    CHECK (tipo_documento_id IN (1, 2, 3, 4)),
  CONSTRAINT chk_conductor_documentos_estatus
    CHECK (estatus IN ('vigente', 'por_vencer', 'vencido', 'no_aplica'))
);

CREATE INDEX IF NOT EXISTS idx_conductor_documentos_conductor_id
  ON public.conductor_documentos(conductor_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.conductor_documento_archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_documento_id UUID NOT NULL REFERENCES public.conductor_documentos(id) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(120) NULL,
  tamano_bytes BIGINT NULL,
  archivo_data BYTEA NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_conductor_documento_archivos_documento_id
  ON public.conductor_documento_archivos(conductor_documento_id)
  WHERE deleted_at IS NULL;
