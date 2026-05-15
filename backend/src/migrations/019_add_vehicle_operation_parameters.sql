-- ===================================================================
-- MIGRACION: PARAMETROS OPERATIVOS POR VEHICULO
-- ===================================================================
-- Fecha: 2026-05-15
-- Descripcion: Guarda configuraciones operativas por vehiculo para
--              gasolina, rendimiento y alertas de cambio de aceite.
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.vehiculo_parametros_operativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL UNIQUE REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  capacidad_tanque_litros NUMERIC(12,2),
  rendimiento_objetivo_km_l NUMERIC(12,2),
  porcentaje_precaucion_menor NUMERIC(5,2),
  porcentaje_precaucion_mayor NUMERIC(5,2),
  tiempo_cambio_aceite_meses INTEGER,
  aviso_previo_tiempo_aceite_meses INTEGER,
  distancia_cambio_aceite_km NUMERIC(12,2),
  aviso_previo_cambio_aceite_km NUMERIC(12,2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT chk_parametros_tanque CHECK (capacidad_tanque_litros IS NULL OR capacidad_tanque_litros > 0),
  CONSTRAINT chk_parametros_rendimiento CHECK (rendimiento_objetivo_km_l IS NULL OR rendimiento_objetivo_km_l > 0),
  CONSTRAINT chk_parametros_precaucion_menor CHECK (
    porcentaje_precaucion_menor IS NULL
    OR (porcentaje_precaucion_menor >= 0 AND porcentaje_precaucion_menor <= 100)
  ),
  CONSTRAINT chk_parametros_precaucion_mayor CHECK (
    porcentaje_precaucion_mayor IS NULL
    OR (porcentaje_precaucion_mayor >= 0 AND porcentaje_precaucion_mayor <= 100)
  ),
  CONSTRAINT chk_parametros_precaucion_orden CHECK (
    porcentaje_precaucion_menor IS NULL
    OR porcentaje_precaucion_mayor IS NULL
    OR porcentaje_precaucion_mayor >= porcentaje_precaucion_menor
  ),
  CONSTRAINT chk_parametros_tiempo_aceite CHECK (tiempo_cambio_aceite_meses IS NULL OR tiempo_cambio_aceite_meses > 0),
  CONSTRAINT chk_parametros_aviso_tiempo CHECK (aviso_previo_tiempo_aceite_meses IS NULL OR aviso_previo_tiempo_aceite_meses >= 0),
  CONSTRAINT chk_parametros_aviso_tiempo_orden CHECK (
    tiempo_cambio_aceite_meses IS NULL
    OR aviso_previo_tiempo_aceite_meses IS NULL
    OR aviso_previo_tiempo_aceite_meses <= tiempo_cambio_aceite_meses
  ),
  CONSTRAINT chk_parametros_distancia_aceite CHECK (distancia_cambio_aceite_km IS NULL OR distancia_cambio_aceite_km > 0),
  CONSTRAINT chk_parametros_aviso_distancia CHECK (aviso_previo_cambio_aceite_km IS NULL OR aviso_previo_cambio_aceite_km >= 0),
  CONSTRAINT chk_parametros_aviso_distancia_orden CHECK (
    distancia_cambio_aceite_km IS NULL
    OR aviso_previo_cambio_aceite_km IS NULL
    OR aviso_previo_cambio_aceite_km <= distancia_cambio_aceite_km
  )
);

CREATE INDEX IF NOT EXISTS idx_vehiculo_parametros_operativos_vehiculo_id
  ON public.vehiculo_parametros_operativos(vehiculo_id)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.vehiculo_parametros_operativos IS
'Parametros operativos configurables por vehiculo para cargas de gasolina y mantenimiento preventivo';
