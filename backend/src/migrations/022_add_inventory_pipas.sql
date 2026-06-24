-- ===================================================================
-- MIGRACION: INVENTARIO DE PIPAS DE COMBUSTIBLE
-- ===================================================================
-- Fecha: 2026-06-22
-- Descripcion: Crea el catalogo de pipas y el historial de recargas
--              para controlar capacidad maxima, litros actuales
--              y costo de compras de combustible.
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.inventario_pipas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  tipo_combustible VARCHAR(50) NOT NULL,
  capacidad_maxima_litros NUMERIC(12,2) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventario_pipas_capacidad_maxima'
  ) THEN
    ALTER TABLE public.inventario_pipas
      ADD CONSTRAINT chk_inventario_pipas_capacidad_maxima
      CHECK (capacidad_maxima_litros > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventario_pipas_tipo_combustible'
  ) THEN
    ALTER TABLE public.inventario_pipas
      ADD CONSTRAINT chk_inventario_pipas_tipo_combustible
      CHECK (tipo_combustible IN ('diesel', 'magma', 'premium'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inventario_pipa_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipa_id UUID NOT NULL REFERENCES public.inventario_pipas(id),
  fecha DATE NOT NULL,
  lugar VARCHAR(255) NOT NULL,
  litros_iniciales NUMERIC(12,2) NOT NULL,
  litros_finales NUMERIC(12,2) NOT NULL,
  litros_comprados NUMERIC(12,2) NOT NULL,
  costo_total_compra NUMERIC(12,2) NOT NULL,
  nombre_pipa_snapshot VARCHAR(150) NOT NULL,
  tipo_combustible_snapshot VARCHAR(50) NOT NULL,
  capacidad_maxima_snapshot NUMERIC(12,2) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventario_pipa_registros_litros_iniciales'
  ) THEN
    ALTER TABLE public.inventario_pipa_registros
      ADD CONSTRAINT chk_inventario_pipa_registros_litros_iniciales
      CHECK (litros_iniciales >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventario_pipa_registros_litros_finales'
  ) THEN
    ALTER TABLE public.inventario_pipa_registros
      ADD CONSTRAINT chk_inventario_pipa_registros_litros_finales
      CHECK (litros_finales >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventario_pipa_registros_litros_comprados'
  ) THEN
    ALTER TABLE public.inventario_pipa_registros
      ADD CONSTRAINT chk_inventario_pipa_registros_litros_comprados
      CHECK (litros_comprados >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventario_pipa_registros_costo_total'
  ) THEN
    ALTER TABLE public.inventario_pipa_registros
      ADD CONSTRAINT chk_inventario_pipa_registros_costo_total
      CHECK (costo_total_compra >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventario_pipa_registros_combustible'
  ) THEN
    ALTER TABLE public.inventario_pipa_registros
      ADD CONSTRAINT chk_inventario_pipa_registros_combustible
      CHECK (tipo_combustible_snapshot IN ('diesel', 'magma', 'premium'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventario_pipa_registros_capacidad'
  ) THEN
    ALTER TABLE public.inventario_pipa_registros
      ADD CONSTRAINT chk_inventario_pipa_registros_capacidad
      CHECK (capacidad_maxima_snapshot > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventario_pipas_activos
  ON public.inventario_pipas(nombre)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_pipas_combustible
  ON public.inventario_pipas(tipo_combustible)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_pipa_registros_pipa
  ON public.inventario_pipa_registros(pipa_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventario_pipa_registros_fecha
  ON public.inventario_pipa_registros(fecha DESC, created_at DESC)
  WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'inventario_pipas_update_timestamp'
  ) THEN
    CREATE TRIGGER inventario_pipas_update_timestamp
    BEFORE UPDATE ON public.inventario_pipas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'inventario_pipa_registros_update_timestamp'
  ) THEN
    CREATE TRIGGER inventario_pipa_registros_update_timestamp
    BEFORE UPDATE ON public.inventario_pipa_registros
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
