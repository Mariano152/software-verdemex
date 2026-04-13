-- ===================================================================
-- MIGRACIÓN RF1: REGISTRO VEHICULAR - ESTRUCTURA COMPLETA NORMALIZADA
-- ===================================================================
-- Fecha: 2026-04-09
-- Versión: V.01 RF1-2026
-- Descripción: Crea la estructura completa para gestión de vehículos
--              con soft deletes, auditoría y escalabilidad
-- ===================================================================

-- 1. EXTENSIONES
-- ===================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- 2. FUNCIONES
-- Función: update_updated_at_column() - definida en 002_seed_admin_user.sql


-- 3. TABLAS PRINCIPALES
-- ===================================================================

-- TABLA: vehiculos
-- Información general del vehículo (sin numero_economico, sin documentos)
CREATE TABLE IF NOT EXISTS public.vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propietario_nombre VARCHAR(255) NOT NULL,
  placa VARCHAR(20) NOT NULL,
  numero_serie VARCHAR(100) NOT NULL UNIQUE,
  marca VARCHAR(100) NOT NULL,
  modelo SMALLINT NOT NULL,
  color VARCHAR(50),
  capacidad_kg NUMERIC(12,2),
  descripcion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT vehiculos_placa_unique UNIQUE(placa),
  CONSTRAINT vehiculos_modelo_valid CHECK(modelo > 1900 AND modelo <= 2100)
);

-- TABLA CATÁLOGO: catalogo_tipos_documento_vehicular
-- Tipos de documentos/permisos que puede tener un vehículo
CREATE TABLE IF NOT EXISTS public.catalogo_tipos_documento_vehicular (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- TABLA: vehiculo_documentos
-- Documentos, permisos y verificaciones de cada vehículo
-- Estructura normalizada: cada documento es un registro independiente
CREATE TABLE IF NOT EXISTS public.vehiculo_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  tipo_documento_id INT NOT NULL REFERENCES public.catalogo_tipos_documento_vehicular(id) ON DELETE RESTRICT,
  ambito VARCHAR(30) NOT NULL,
  estado VARCHAR(100),
  dependencia_otorga VARCHAR(255),
  vigencia DATE,
  folio_oficio VARCHAR(100),
  archivo_url TEXT,
  observaciones TEXT,
  estatus VARCHAR(30) NOT NULL DEFAULT 'vigente',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT vehiculo_documentos_ambito_check 
    CHECK(ambito IN ('federal', 'estatal_jalisco', 'estatal_otro')),
  CONSTRAINT vehiculo_documentos_estatus_check 
    CHECK(estatus IN ('vigente', 'vencido', 'cancelado', 'en_revision'))
);

-- TABLA CATÁLOGO: catalogo_elementos_seguridad
-- Catálogo de elementos de seguridad que pueden tener vehículos
CREATE TABLE IF NOT EXISTS public.catalogo_elementos_seguridad (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- TABLA: vehiculo_elementos_seguridad
-- Checklist de seguridad para cada vehículo
CREATE TABLE IF NOT EXISTS public.vehiculo_elementos_seguridad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  elemento_seguridad_id INT NOT NULL REFERENCES public.catalogo_elementos_seguridad(id) ON DELETE RESTRICT,
  estatus VARCHAR(20) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT vehiculo_elementos_seguridad_estatus_check 
    CHECK(estatus IN ('si', 'no', 'no_aplica')),
  CONSTRAINT vehiculo_elementos_seguridad_unique 
    UNIQUE(vehiculo_id, elemento_seguridad_id)
);

-- TABLA: vehiculo_fotografias
-- Memoria fotográfica del vehículo usando Cloudinary URLs
CREATE TABLE IF NOT EXISTS public.vehiculo_fotografias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  categoria VARCHAR(50) NOT NULL,
  tipo_foto VARCHAR(100) NOT NULL,
  archivo_url TEXT NOT NULL,
  descripcion TEXT,
  fecha_foto TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT vehiculo_fotografias_categoria_check 
    CHECK(categoria IN ('general', 'seguridad')),
  CONSTRAINT vehiculo_fotografias_tipo_check 
    CHECK(tipo_foto IN (
      'frente', 'parte_trasera', 'lado_piloto', 'lado_copiloto', 
      'senales_y_luces', 'estrobos', 'extintor', 
      'rotulacion', 'torreta', 'proteccion_antiderrames',
      'equipo_comunicacion', 'arnes_y_conectores', 'equipo_proteccion_personal', 'otros'
    ))
);

-- TABLA FUTURA: vehiculo_incidencias
-- Para registro de incidencias (todavía no en uso pero creada para escalabilidad)
CREATE TABLE IF NOT EXISTS public.vehiculo_incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  fecha_incidencia TIMESTAMP NOT NULL,
  tipo_incidencia VARCHAR(100),
  descripcion TEXT NOT NULL,
  estatus VARCHAR(30) NOT NULL DEFAULT 'abierta',
  resuelta_en TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT vehiculo_incidencias_estatus_check 
    CHECK(estatus IN ('abierta', 'en_proceso', 'resuelta', 'cancelada'))
);

-- TABLA FUTURA: vehiculo_historial_estatus
-- Para historial de cambios de estado del vehículo
CREATE TABLE IF NOT EXISTS public.vehiculo_historial_estatus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  estatus VARCHAR(50) NOT NULL,
  motivo TEXT,
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT vehiculo_historial_estatus_check 
    CHECK(estatus IN (
      'activo', 'en_mantenimiento', 'fuera_de_servicio', 'baja', 'vendido'
    ))
);


-- 4. ÍNDICES
-- ===================================================================

-- Índices en vehiculos
CREATE INDEX IF NOT EXISTS idx_vehiculos_placa ON public.vehiculos(placa);
CREATE INDEX IF NOT EXISTS idx_vehiculos_numero_serie ON public.vehiculos(numero_serie);
CREATE INDEX IF NOT EXISTS idx_vehiculos_deleted_at ON public.vehiculos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_vehiculos_activos ON public.vehiculos(id) WHERE deleted_at IS NULL;

-- Índices en vehiculo_documentos
CREATE INDEX IF NOT EXISTS idx_vehiculo_documentos_vehiculo_id ON public.vehiculo_documentos(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_documentos_tipo_documento_id ON public.vehiculo_documentos(tipo_documento_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_documentos_vigencia ON public.vehiculo_documentos(vigencia);
CREATE INDEX IF NOT EXISTS idx_vehiculo_documentos_ambito ON public.vehiculo_documentos(ambito);
CREATE INDEX IF NOT EXISTS idx_vehiculo_documentos_estatus ON public.vehiculo_documentos(estatus);
CREATE INDEX IF NOT EXISTS idx_vehiculo_documentos_activos ON public.vehiculo_documentos(vehiculo_id) 
  WHERE deleted_at IS NULL;

-- Índices en vehiculo_elementos_seguridad
CREATE INDEX IF NOT EXISTS idx_vehiculo_elementos_seguridad_vehiculo_id ON public.vehiculo_elementos_seguridad(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_elementos_seguridad_elemento_id ON public.vehiculo_elementos_seguridad(elemento_seguridad_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_elementos_seguridad_activos ON public.vehiculo_elementos_seguridad(vehiculo_id) 
  WHERE deleted_at IS NULL;

-- Índices en vehiculo_fotografias
CREATE INDEX IF NOT EXISTS idx_vehiculo_fotografias_vehiculo_id ON public.vehiculo_fotografias(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_fotografias_categoria ON public.vehiculo_fotografias(categoria);
CREATE INDEX IF NOT EXISTS idx_vehiculo_fotografias_tipo_foto ON public.vehiculo_fotografias(tipo_foto);
CREATE INDEX IF NOT EXISTS idx_vehiculo_fotografias_activas ON public.vehiculo_fotografias(vehiculo_id) 
  WHERE deleted_at IS NULL;

-- Índices en vehiculo_incidencias
CREATE INDEX IF NOT EXISTS idx_vehiculo_incidencias_vehiculo_id ON public.vehiculo_incidencias(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_incidencias_estatus ON public.vehiculo_incidencias(estatus);
CREATE INDEX IF NOT EXISTS idx_vehiculo_incidencias_activas ON public.vehiculo_incidencias(vehiculo_id) 
  WHERE deleted_at IS NULL;

-- Índices en vehiculo_historial_estatus
CREATE INDEX IF NOT EXISTS idx_vehiculo_historial_estatus_vehiculo_id ON public.vehiculo_historial_estatus(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_historial_estatus_activos ON public.vehiculo_historial_estatus(vehiculo_id) 
  WHERE deleted_at IS NULL;


-- 5. TRIGGERS PARA updated_at
-- ========================================================================
-- Los triggers se crean manualmente con psql porque el parser SQL falla
-- con funciones plpgsql. Para crearlos manualmente, ejecutar en psql:
--
-- CREATE TRIGGER vehiculos_update_timestamp 
--   BEFORE UPDATE ON public.vehiculos
--   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
--
-- (Repetir para cada tabla con updated_at)
-- ========================================================================


-- 6. VISTAS PARA REGISTROS ACTIVOS
-- ===================================================================

CREATE OR REPLACE VIEW vw_vehiculos_activos AS
SELECT * FROM public.vehiculos
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_catalogo_tipos_documento_activos AS
SELECT * FROM public.catalogo_tipos_documento_vehicular
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_vehiculo_documentos_activos AS
SELECT * FROM public.vehiculo_documentos
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_catalogo_elementos_seguridad_activos AS
SELECT * FROM public.catalogo_elementos_seguridad
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_vehiculo_elementos_seguridad_activos AS
SELECT * FROM public.vehiculo_elementos_seguridad
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_vehiculo_fotografias_activas AS
SELECT * FROM public.vehiculo_fotografias
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_vehiculo_incidencias_activas AS
SELECT * FROM public.vehiculo_incidencias
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_vehiculo_historial_estatus_activos AS
SELECT * FROM public.vehiculo_historial_estatus
WHERE deleted_at IS NULL;

-- Vista de resumen de vehículos con sus documentos activos
CREATE OR REPLACE VIEW vw_vehiculos_con_documentos AS
SELECT 
  v.id,
  v.propietario_nombre,
  v.placa,
  v.numero_serie,
  v.marca,
  v.modelo,
  v.color,
  v.capacidad_kg,
  COUNT(vd.id) as total_documentos,
  SUM(CASE WHEN vd.estatus = 'vigente' THEN 1 ELSE 0 END) as documentos_vigentes
FROM public.vw_vehiculos_activos v
LEFT JOIN public.vw_vehiculo_documentos_activos vd ON v.id = vd.vehiculo_id
GROUP BY v.id, v.propietario_nombre, v.placa, v.numero_serie, v.marca, v.modelo, v.color, v.capacidad_kg;


-- 7. DATOS INICIALES - CATÁLOGOS
-- ===================================================================

-- Catálogo de tipos de documentos vehiculares
INSERT INTO public.catalogo_tipos_documento_vehicular (nombre, descripcion) VALUES
  ('Tarjeta de circulación', 'Documento de registro federal del vehículo'),
  ('Constancia de condiciones físico-mecánicas', 'Verificación de estado técnico del vehículo'),
  ('Verificación estatal', 'Verificación de contaminantes a nivel estatal'),
  ('Permiso especial', 'Permisos especiales de operación'),
  ('Seguro', 'Póliza de seguro vigente'),
  ('Refrendo', 'Refrendo anual de tenencia o verificación'),
  ('Tenencia', 'Pago de tenencia federal');

-- Catálogo de elementos de seguridad
INSERT INTO public.catalogo_elementos_seguridad (nombre, descripcion) VALUES
  ('Rotulación', 'Letras y símbolos de identificación visible'),
  ('Luces de iluminación para trabajo nocturno', 'Luces generales y reverseros'),
  ('Señales de alerta reflejantes', 'Señales triangulares y cinta reflectante'),
  ('Estrobos', 'Luces de advertencia intermitentes'),
  ('Torreta', 'Torreta de advertencia en techo'),
  ('Alarma sonora de reversa', 'Alarma audible al retroceder'),
  ('Arnés y conectores tipo automotriz', 'Sistemas de amarre remolque'),
  ('Equipo de comunicación', 'GPS, telemetría, radio'),
  ('Extintor', 'Extintor de incendios reglamentario'),
  ('Protección anti derrames de líquidos', 'Diques y bandejas anti derrames'),
  ('Equipo de protección personal', 'Chalecos, cascos, conos reflectantes');

-- ===================================================================
-- FIN DE MIGRACIÓN RF1
-- ===================================================================
