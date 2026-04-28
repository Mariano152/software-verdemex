-- ===================================================================
-- MIGRACION: HISTORIAL DE CARGAS DE GASOLINA VEHICULAR
-- ===================================================================
-- Fecha: 2026-04-28
-- Descripcion: Registra cargas de gasolina con litros, costo y adjuntos
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.vehiculo_gasolina_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  titulo VARCHAR(255) NOT NULL,
  tipo_combustible VARCHAR(120) NOT NULL,
  fecha_carga DATE NOT NULL,
  costo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  litros NUMERIC(12,2) NOT NULL DEFAULT 0,
  proveedor VARCHAR(255),
  descripcion TEXT,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT chk_vehiculo_gasolina_costo CHECK (costo_total >= 0),
  CONSTRAINT chk_vehiculo_gasolina_litros CHECK (litros > 0)
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_registros_vehiculo_id
  ON public.vehiculo_gasolina_registros(vehiculo_id);

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_registros_fecha_carga
  ON public.vehiculo_gasolina_registros(fecha_carga DESC);

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_registros_activos
  ON public.vehiculo_gasolina_registros(vehiculo_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.vehiculo_gasolina_archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_gasolina_registro_id UUID NOT NULL REFERENCES public.vehiculo_gasolina_registros(id) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(120) NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  archivo_data BYTEA NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_archivos_registro_id
  ON public.vehiculo_gasolina_archivos(vehiculo_gasolina_registro_id);

CREATE INDEX IF NOT EXISTS idx_vehiculo_gasolina_archivos_orden
  ON public.vehiculo_gasolina_archivos(vehiculo_gasolina_registro_id, orden);

COMMENT ON TABLE public.vehiculo_gasolina_registros IS
'Historial de cargas de gasolina realizadas a cada vehiculo';

COMMENT ON TABLE public.vehiculo_gasolina_archivos IS
'Archivos adjuntos asociados a cada registro de gasolina vehicular';
