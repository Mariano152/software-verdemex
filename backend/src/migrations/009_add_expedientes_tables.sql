-- ===================================================================
-- MIGRACIÓN: EXPEDIENTES - ESTRUCTURA PARA GESTIÓN DE EXPEDIENTES
-- ===================================================================
-- Fecha: 2026-04-14  
-- Descripción: Crea tablas para gestionar expedientes de vehículos
-- ===================================================================

-- TABLA: expedientes
-- Tabla principal para expedientes de vehículos
CREATE TABLE IF NOT EXISTS public.expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(30) NOT NULL DEFAULT 'activo',
  prioridad VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT expedientes_estado_check 
    CHECK(estado IN ('activo', 'completado', 'archivado', 'cancelado')),
  CONSTRAINT expedientes_prioridad_check 
    CHECK(prioridad IN ('baja', 'normal', 'alta', 'urgente'))
);

-- TABLA: expediente_items
-- Items o tareas dentro de cada expediente (pueden ser actividades, documentos, etc.)
CREATE TABLE IF NOT EXISTS public.expediente_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID NOT NULL REFERENCES public.expedientes(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  tipo_item VARCHAR(50) DEFAULT 'actividad',
  estado_item VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  completado BOOLEAN DEFAULT FALSE,
  fecha_vencimiento DATE,
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT expediente_items_tipo_check 
    CHECK(tipo_item IN ('actividad', 'documento', 'observacion', 'otro')),
  CONSTRAINT expediente_items_estado_check 
    CHECK(estado_item IN ('pendiente', 'en_proceso', 'completado', 'cancelado'))
);

-- ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_expedientes_vehiculo_id ON public.expedientes(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_expedientes_estado ON public.expedientes(estado);
CREATE INDEX IF NOT EXISTS idx_expedientes_created_at ON public.expedientes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expediente_items_expediente_id ON public.expediente_items(expediente_id);
CREATE INDEX IF NOT EXISTS idx_expediente_items_completado ON public.expediente_items(completado);

-- Aplicar trigger para updated_at
-- Se asume que ya existe la función update_updated_at_column()
CREATE TRIGGER update_expedientes_updated_at BEFORE UPDATE ON public.expedientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expediente_items_updated_at BEFORE UPDATE ON public.expediente_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
