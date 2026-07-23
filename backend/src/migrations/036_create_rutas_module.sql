-- ===================================================================
-- MIGRACION: MODULO DE RUTAS
-- ===================================================================
-- Fecha: 2026-07-17
-- Descripcion: Crea la tabla principal para registrar rutas operativas
--              ligadas a conductores y vehiculos.
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.rutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES public.conductores(id) ON DELETE RESTRICT,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  origen VARCHAR(255) NOT NULL,
  destino VARCHAR(255) NOT NULL,
  kilometros_programados NUMERIC(12,2) NOT NULL,
  metros_cubicos_enviados NUMERIC(12,2) NOT NULL,
  tipo_unidad VARCHAR(20) NOT NULL,
  fecha_registro DATE NOT NULL,
  fecha_entrega DATE NOT NULL,
  observaciones TEXT NULL,
  descripcion TEXT NULL,
  valor_monetario NUMERIC(14,2) NOT NULL DEFAULT 0,
  estatus VARCHAR(20) NOT NULL DEFAULT 'programada',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT chk_rutas_kilometros_programados
    CHECK (kilometros_programados >= 0),
  CONSTRAINT chk_rutas_metros_cubicos_enviados
    CHECK (metros_cubicos_enviados >= 0),
  CONSTRAINT chk_rutas_valor_monetario
    CHECK (valor_monetario >= 0),
  CONSTRAINT chk_rutas_tipo_unidad
    CHECK (tipo_unidad IN ('gondola', 'trailer', 'ambos')),
  CONSTRAINT chk_rutas_estatus
    CHECK (estatus IN ('programada', 'en_proceso', 'entregada', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS idx_rutas_conductor_id
  ON public.rutas(conductor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rutas_vehiculo_id
  ON public.rutas(vehiculo_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rutas_estatus
  ON public.rutas(estatus)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rutas_fecha_entrega
  ON public.rutas(fecha_entrega)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.rutas IS
'Registro operativo de rutas asignadas a un conductor y un vehiculo';
