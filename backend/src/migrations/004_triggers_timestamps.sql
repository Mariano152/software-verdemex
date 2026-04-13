-- ===================================================================
-- TRIGGERS Y FUNCIÓN - Versión compacta para evitar parser errors
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función en una sola línea (sin saltos problemáticos)
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql AS 'BEGIN NEW.updated_at = NOW(); RETURN NEW; END';

-- Triggers
CREATE TRIGGER IF NOT EXISTS vehiculos_update_timestamp BEFORE UPDATE ON public.vehiculos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS catalogo_tipos_documento_vehicular_update_timestamp BEFORE UPDATE ON public.catalogo_tipos_documento_vehicular FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS vehiculo_documentos_update_timestamp BEFORE UPDATE ON public.vehiculo_documentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS catalogo_elementos_seguridad_update_timestamp BEFORE UPDATE ON public.catalogo_elementos_seguridad FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS vehiculo_elementos_seguridad_update_timestamp BEFORE UPDATE ON public.vehiculo_elementos_seguridad FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS vehiculo_fotografias_update_timestamp BEFORE UPDATE ON public.vehiculo_fotografias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS vehiculo_incidencias_update_timestamp BEFORE UPDATE ON public.vehiculo_incidencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS vehiculo_historial_estatus_update_timestamp BEFORE UPDATE ON public.vehiculo_historial_estatus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS users_update_timestamp BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
