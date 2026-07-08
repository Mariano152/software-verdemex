-- ===================================================================
-- MIGRACION: AGREGAR NOMBRE A DOCUMENTOS DE CONDUCTORES
-- ===================================================================
-- Fecha: 2026-07-02
-- Descripcion: Agrega el nombre del documento al expediente de
--              documentos de conductores.
-- ===================================================================

ALTER TABLE public.conductor_documentos
ADD COLUMN IF NOT EXISTS nombre_documento VARCHAR(160);

UPDATE public.conductor_documentos
SET nombre_documento = CASE tipo_documento_id
  WHEN 1 THEN 'Licencia de conducir'
  WHEN 2 THEN 'Acto medico'
  WHEN 3 THEN 'INE o identificacion oficial'
  WHEN 4 THEN 'R control'
  ELSE 'Documento'
END
WHERE nombre_documento IS NULL OR BTRIM(nombre_documento) = '';

ALTER TABLE public.conductor_documentos
ALTER COLUMN nombre_documento SET NOT NULL;
