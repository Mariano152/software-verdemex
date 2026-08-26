import { routeModel } from '../models/routeModel.js';
import { driverModel } from '../models/driverModel.js';
import { vehicleModel } from '../models/vehicleModel.js';

const VALID_ROUTE_TYPES = ['gondola', 'trailer', 'ambos'];
const VALID_ROUTE_STATUSES = ['programada', 'en_proceso', 'entregada', 'cancelada'];

const normalizeText = (value) => String(value || '').trim();
const normalizeNullableText = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};
const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildRoutePayload = (body = {}) => ({
  conductor_id: normalizeText(body.conductor_id),
  vehiculo_id: normalizeText(body.vehiculo_id),
  origen: normalizeText(body.origen),
  destino: normalizeText(body.destino),
  kilometros_programados: normalizeNumber(body.kilometros_programados),
  metros_cubicos_enviados: normalizeNumber(body.metros_cubicos_enviados),
  tipo_unidad: normalizeText(body.tipo_unidad).toLowerCase(),
  fecha_registro: normalizeText(body.fecha_registro),
  fecha_entrega: normalizeText(body.fecha_entrega),
  observaciones: normalizeNullableText(body.observaciones),
  descripcion: normalizeNullableText(body.descripcion),
  valor_monetario: normalizeNumber(body.valor_monetario),
  estatus: normalizeText(body.estatus || 'programada').toLowerCase()
});

const validateRoutePayload = (routeData) => {
  if (!routeData.conductor_id) return 'El conductor es requerido';
  if (!routeData.vehiculo_id) return 'El vehiculo es requerido';
  if (!routeData.origen) return 'El origen es requerido';
  if (!routeData.destino) return 'El destino es requerido';
  if (routeData.kilometros_programados === null || routeData.kilometros_programados < 0) {
    return 'Los kilometros programados son requeridos y deben ser mayores o iguales a 0';
  }
  if (routeData.metros_cubicos_enviados === null || routeData.metros_cubicos_enviados < 0) {
    return 'Los metros cubicos enviados son requeridos y deben ser mayores o iguales a 0';
  }
  if (!VALID_ROUTE_TYPES.includes(routeData.tipo_unidad)) {
    return 'Selecciona un tipo de unidad valido';
  }
  if (!routeData.fecha_registro) return 'La fecha de registro es requerida';
  if (!routeData.fecha_entrega) return 'La fecha de entrega es requerida';
  if (routeData.valor_monetario === null || routeData.valor_monetario < 0) {
    return 'El valor monetario es requerido y debe ser mayor o igual a 0';
  }
  if (!VALID_ROUTE_STATUSES.includes(routeData.estatus)) {
    return 'Selecciona un estatus valido para la ruta';
  }
  if (routeData.fecha_entrega < routeData.fecha_registro) {
    return 'La fecha de entrega no puede ser anterior a la fecha de registro';
  }

  return null;
};

const validateRelations = async (routeData) => {
  const [driver, vehicle] = await Promise.all([
    driverModel.getDriverById(routeData.conductor_id),
    vehicleModel.getVehicleById(routeData.vehiculo_id)
  ]);

  if (!driver) {
    return 'El conductor seleccionado no existe';
  }

  if (!vehicle) {
    return 'El vehiculo seleccionado no existe';
  }

  return null;
};

export const routeController = {
  async listRoutes(req, res) {
    try {
      const routes = await routeModel.listRoutes();
      res.json({ routes });
    } catch (error) {
      console.error('Error listando rutas:', error);
      res.status(500).json({
        message: 'Error al obtener rutas',
        error: error.message
      });
    }
  },

  async getRouteById(req, res) {
    try {
      const route = await routeModel.getRouteById(req.params.id);

      if (!route) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      res.json(route);
    } catch (error) {
      console.error('Error obteniendo ruta:', error);
      res.status(500).json({
        message: 'Error al obtener ruta',
        error: error.message
      });
    }
  },

  async createRoute(req, res) {
    try {
      const routeData = buildRoutePayload(req.body);
      const validationError = validateRoutePayload(routeData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const relationError = await validateRelations(routeData);
      if (relationError) {
        return res.status(400).json({ message: relationError });
      }

      const route = await routeModel.createRoute(routeData);
      res.status(201).json({
        message: 'Ruta creada correctamente',
        route
      });
    } catch (error) {
      console.error('Error creando ruta:', error);
      res.status(500).json({
        message: 'Error al crear ruta',
        error: error.message
      });
    }
  },

  async updateRoute(req, res) {
    try {
      const existingRoute = await routeModel.getRouteById(req.params.id);

      if (!existingRoute) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      const routeData = buildRoutePayload(req.body);
      const validationError = validateRoutePayload(routeData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const relationError = await validateRelations(routeData);
      if (relationError) {
        return res.status(400).json({ message: relationError });
      }

      const route = await routeModel.updateRoute(req.params.id, routeData);
      res.json({
        message: 'Ruta actualizada correctamente',
        route
      });
    } catch (error) {
      console.error('Error actualizando ruta:', error);
      res.status(500).json({
        message: 'Error al actualizar ruta',
        error: error.message
      });
    }
  },

  async deleteRoute(req, res) {
    try {
      const existingRoute = await routeModel.getRouteById(req.params.id);
      if (!existingRoute) return res.status(404).json({ message: 'Ruta no encontrada' });
      const deletedRoute = await routeModel.deleteRoute(req.params.id);

      if (!deletedRoute) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      res.json({ message: 'Ruta eliminada correctamente', deletedRoute: { id: deletedRoute.id, descripcion: existingRoute.descripcion, origen: existingRoute.origen, destino: existingRoute.destino } });
    } catch (error) {
      console.error('Error eliminando ruta:', error);
      res.status(500).json({
        message: 'Error al eliminar ruta',
        error: error.message
      });
    }
  }
};
