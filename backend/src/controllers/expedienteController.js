import { expedienteModel } from '../models/expedienteModel.js';

export const expedienteController = {
  // Obtener expedientes de un vehículo
  async getExpedientesByVehicle(req, res) {
    try {
      const { vehicleId } = req.params;
      const expedientes = await expedienteModel.getExpedientesByVehiculeId(vehicleId);

      res.json({
        expedientes,
        total: expedientes.length
      });
    } catch (error) {
      console.error('❌ Error obteniendo expedientes:', error);
      res.status(500).json({
        message: 'Error al obtener expedientes',
        error: error.message
      });
    }
  },

  // Obtener un expediente con sus items
  async getExpedienteById(req, res) {
    try {
      const { expedienteId } = req.params;
      const expediente = await expedienteModel.getExpedienteById(expedienteId);

      if (!expediente) {
        return res.status(404).json({
          message: 'Expediente no encontrado'
        });
      }

      res.json(expediente);
    } catch (error) {
      console.error('❌ Error obteniendo expediente:', error);
      res.status(500).json({
        message: 'Error al obtener expediente',
        error: error.message
      });
    }
  },

  // Crear expediente
  async createExpediente(req, res) {
    try {
      const { vehicleId } = req.params;
      const { titulo, descripcion, prioridad } = req.body;

      if (!titulo?.trim()) {
        return res.status(400).json({
          message: 'El título del expediente es requerido'
        });
      }

      const expediente = await expedienteModel.createExpediente(vehicleId, {
        titulo,
        descripcion,
        prioridad
      });

      console.log(`✅ Expediente creado: ${expediente.id}`);
      res.status(201).json(expediente);
    } catch (error) {
      console.error('❌ Error creando expediente:', error);
      res.status(500).json({
        message: 'Error al crear expediente',
        error: error.message
      });
    }
  },

  // Actualizar expediente
  async updateExpediente(req, res) {
    try {
      const { expedienteId } = req.params;
      const { titulo, descripcion, estado, prioridad } = req.body;

      if (!titulo?.trim()) {
        return res.status(400).json({
          message: 'El título del expediente es requerido'
        });
      }

      const expediente = await expedienteModel.updateExpediente(expedienteId, {
        titulo,
        descripcion,
        estado,
        prioridad
      });

      console.log(`✅ Expediente actualizado: ${expedienteId}`);
      res.json(expediente);
    } catch (error) {
      console.error('❌ Error actualizando expediente:', error);
      res.status(500).json({
        message: 'Error al actualizar expediente',
        error: error.message
      });
    }
  },

  // Crear item en expediente
  async createExpedienteItem(req, res) {
    try {
      const { expedienteId } = req.params;
      const { contenido, tipo_item, fecha_vencimiento, notas } = req.body;

      if (!contenido?.trim()) {
        return res.status(400).json({
          message: 'El contenido del item es requerido'
        });
      }

      const item = await expedienteModel.createExpedienteItem(expedienteId, {
        contenido,
        tipo_item,
        fecha_vencimiento,
        notas
      });

      console.log(`✅ Item creado en expediente: ${item.id}`);
      res.status(201).json(item);
    } catch (error) {
      console.error('❌ Error creando item:', error);
      res.status(500).json({
        message: 'Error al crear item',
        error: error.message
      });
    }
  },

  // Actualizar item de expediente
  async updateExpedienteItem(req, res) {
    try {
      const { itemId } = req.params;
      const { contenido, estado_item, completado, fecha_vencimiento, notas } = req.body;

      const item = await expedienteModel.updateExpedienteItem(itemId, {
        contenido,
        estado_item,
        completado,
        fecha_vencimiento,
        notas
      });

      console.log(`✅ Item actualizado: ${itemId}`);
      res.json(item);
    } catch (error) {
      console.error('❌ Error actualizando item:', error);
      res.status(500).json({
        message: 'Error al actualizar item',
        error: error.message
      });
    }
  },

  // Toggle completación de item
  async toggleItemCompletion(req, res) {
    try {
      const { itemId } = req.params;

      const item = await expedienteModel.toggleItemCompletion(itemId);

      console.log(`✅ Estado del item ${itemId} actualizado`);
      res.json(item);
    } catch (error) {
      console.error('❌ Error toggleando item:', error);
      res.status(500).json({
        message: 'Error al cambiar estado del item',
        error: error.message
      });
    }
  },

  // Eliminar item (soft delete)
  async deleteExpedienteItem(req, res) {
    try {
      const { itemId } = req.params;

      const item = await expedienteModel.deleteExpedienteItem(itemId);

      console.log(`✅ Item eliminado: ${itemId}`);
      res.json({ message: 'Item eliminado correctamente', item });
    } catch (error) {
      console.error('❌ Error eliminando item:', error);
      res.status(500).json({
        message: 'Error al eliminar item',
        error: error.message
      });
    }
  },

  // Eliminar expediente (soft delete)
  async deleteExpediente(req, res) {
    try {
      const { expedienteId } = req.params;

      const expediente = await expedienteModel.deleteExpediente(expedienteId);

      console.log(`✅ Expediente eliminado: ${expedienteId}`);
      res.json({ message: 'Expediente eliminado correctamente', expediente });
    } catch (error) {
      console.error('❌ Error eliminando expediente:', error);
      res.status(500).json({
        message: 'Error al eliminar expediente',
        error: error.message
      });
    }
  }
};
