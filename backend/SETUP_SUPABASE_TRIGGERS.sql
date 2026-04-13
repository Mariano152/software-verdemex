-- Script para crear triggers en Supabase (ejecutar directamente en Editor SQL)
-- Copiar todo y pegar en Supabase → SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para todas las tablas
CREATE TRIGGER vehiculos_update_timestamp 
  BEFORE UPDATE ON public.vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER catalogo_tipos_documento_vehicular_update_timestamp 
  BEFORE UPDATE ON public.catalogo_tipos_documento_vehicular
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER vehiculo_documentos_update_timestamp 
  BEFORE UPDATE ON public.vehiculo_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER catalogo_elementos_seguridad_update_timestamp 
  BEFORE UPDATE ON public.catalogo_elementos_seguridad
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER vehiculo_elementos_seguridad_update_timestamp 
  BEFORE UPDATE ON public.vehiculo_elementos_seguridad
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER vehiculo_fotografias_update_timestamp 
  BEFORE UPDATE ON public.vehiculo_fotografias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER vehiculo_incidencias_update_timestamp 
  BEFORE UPDATE ON public.vehiculo_incidencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER vehiculo_historial_estatus_update_timestamp 
  BEFORE UPDATE ON public.vehiculo_historial_estatus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER users_update_timestamp 
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER catalogo_tipos_documento_vehicular_pk_update_timestamp 
  BEFORE UPDATE ON public.catalogo_tipos_documento_vehicular
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
