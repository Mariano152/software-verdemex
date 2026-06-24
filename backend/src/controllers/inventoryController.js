import { normalizeFuelType, VALID_FUEL_TYPES } from '../constants/fuelTypes.js';
import { inventoryModel } from '../models/inventoryModel.js';

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
const normalizeDateValue = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};

const buildPipaData = (body = {}) => ({
  nombre: normalizeText(body.nombre),
  tipo_combustible: normalizeFuelType(body.tipo_combustible),
  capacidad_maxima_litros: normalizeNumber(body.capacidad_maxima_litros),
  observaciones: normalizeNullableText(body.observaciones)
});

const validatePipaData = (pipaData) => {
  if (!pipaData.nombre) {
    return 'El nombre de la pipa es obligatorio';
  }

  if (!pipaData.tipo_combustible) {
    return `Selecciona un tipo de combustible valido: ${VALID_FUEL_TYPES.join(', ')}`;
  }

  if (pipaData.capacidad_maxima_litros === null || pipaData.capacidad_maxima_litros <= 0) {
    return 'La capacidad maxima debe ser mayor a 0';
  }

  return null;
};

const buildRecordData = (body = {}, pipa) => {
  const litrosIniciales = normalizeNumber(body.litros_iniciales);
  const litrosFinales = normalizeNumber(body.litros_finales);

  return {
    pipa_id: pipa.id,
    fecha: normalizeDateValue(body.fecha),
    lugar: normalizeText(body.lugar),
    litros_iniciales: litrosIniciales,
    litros_finales: litrosFinales,
    litros_comprados: litrosIniciales !== null && litrosFinales !== null
      ? litrosFinales - litrosIniciales
      : null,
    costo_total_compra: normalizeNumber(body.costo_total_compra),
    nombre_pipa_snapshot: pipa.nombre,
    tipo_combustible_snapshot: pipa.tipo_combustible,
    capacidad_maxima_snapshot: Number(pipa.capacidad_maxima_litros || 0),
    factura: normalizeNullableText(body.factura),
    proveedor: normalizeNullableText(body.proveedor),
    observaciones: normalizeNullableText(body.observaciones)
  };
};

const validateRecordData = (recordData) => {
  if (!recordData.fecha) {
    return 'La fecha es obligatoria';
  }

  if (!recordData.lugar) {
    return 'El lugar es obligatorio';
  }

  if (recordData.litros_iniciales === null || recordData.litros_iniciales < 0) {
    return 'Los litros iniciales deben ser 0 o mayores';
  }

  if (recordData.litros_finales === null || recordData.litros_finales < 0) {
    return 'Los litros finales deben ser 0 o mayores';
  }

  if (recordData.litros_finales < recordData.litros_iniciales) {
    return 'Los litros finales no pueden ser menores a los litros iniciales';
  }

  if (recordData.litros_finales > recordData.capacidad_maxima_snapshot) {
    return 'Los litros finales no pueden superar la capacidad maxima de la pipa';
  }

  if (recordData.litros_comprados === null || recordData.litros_comprados < 0) {
    return 'Los litros comprados deben ser 0 o mayores';
  }

  if (recordData.costo_total_compra === null || recordData.costo_total_compra < 0) {
    return 'El costo total debe ser 0 o mayor';
  }

  if (!recordData.factura) {
    return 'La factura es obligatoria';
  }

  if (!recordData.proveedor) {
    return 'El proveedor es obligatorio';
  }

  return null;
};

export const inventoryController = {
  async listPipas(req, res) {
    try {
      const pipas = await inventoryModel.getAllPipas({
        search: req.query.search || null,
        fuelType: normalizeFuelType(req.query.fuelType)
      });

      res.json({
        message: 'Pipas listadas correctamente',
        count: pipas.length,
        pipas
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      console.error('Error listando pipas:', error);
      res.status(500).json({
        message: 'Error al listar pipas',
        error: error.message
      });
    }
  },

  async getPipaById(req, res) {
    try {
      const { pipaId } = req.params;
      const pipa = await inventoryModel.getPipaById(pipaId);

      if (!pipa) {
        return res.status(404).json({
          message: 'Pipa no encontrada'
        });
      }

      res.json({ pipa });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      console.error('Error obteniendo pipa:', error);
      res.status(500).json({
        message: 'Error al obtener la pipa',
        error: error.message
      });
    }
  },

  async getPipaConsumptionHistory(req, res) {
    try {
      const { pipaId } = req.params;
      const pipa = await inventoryModel.getPipaById(pipaId);

      if (!pipa) {
        return res.status(404).json({
          message: 'Pipa no encontrada'
        });
      }

      const consumptionHistory = await inventoryModel.getPipaConsumptionHistory(pipaId);

      res.json({
        message: 'Historial de consumos de pipa listado correctamente',
        count: consumptionHistory.length,
        pipa,
        consumptionHistory
      });
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial de consumos requiere las migraciones de inventario y FIFO.'
        });
      }

      console.error('Error obteniendo historial de consumos de pipa:', error);
      res.status(500).json({
        message: 'Error al obtener el historial de consumos de la pipa',
        error: error.message
      });
    }
  },

  async createPipa(req, res) {
    try {
      const pipaData = buildPipaData(req.body);
      const validationError = validatePipaData(pipaData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const createdPipa = await inventoryModel.createPipa(pipaData);
      const pipa = await inventoryModel.getPipaById(createdPipa.id);

      res.status(201).json({
        message: 'Pipa creada correctamente',
        pipa
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      console.error('Error creando pipa:', error);
      res.status(500).json({
        message: 'Error al crear la pipa',
        error: error.message
      });
    }
  },

  async updatePipa(req, res) {
    try {
      const { pipaId } = req.params;
      const existingPipa = await inventoryModel.getPipaById(pipaId);

      if (!existingPipa) {
        return res.status(404).json({
          message: 'Pipa no encontrada'
        });
      }

      const pipaData = buildPipaData(req.body);
      const validationError = validatePipaData(pipaData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      await inventoryModel.updatePipa(pipaId, pipaData);
      const pipa = await inventoryModel.getPipaById(pipaId);

      res.json({
        message: 'Pipa actualizada correctamente',
        pipa
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      console.error('Error actualizando pipa:', error);
      res.status(500).json({
        message: 'Error al actualizar la pipa',
        error: error.message
      });
    }
  },

  async deletePipa(req, res) {
    try {
      const { pipaId } = req.params;
      const deletedPipa = await inventoryModel.deletePipa(pipaId);

      if (!deletedPipa) {
        return res.status(404).json({
          message: 'Pipa no encontrada'
        });
      }

      res.json({
        message: 'Pipa eliminada correctamente'
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      console.error('Error eliminando pipa:', error);
      res.status(500).json({
        message: 'Error al eliminar la pipa',
        error: error.message
      });
    }
  },

  async listRecords(req, res) {
    try {
      const inventoryRecords = await inventoryModel.getAllRecords({
        search: req.query.search || null,
        pipaId: req.query.pipaId || null,
        fuelType: normalizeFuelType(req.query.fuelType),
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null
      });

      res.json({
        message: 'Registros de inventario listados correctamente',
        count: inventoryRecords.length,
        inventoryRecords
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      console.error('Error listando registros de inventario:', error);
      res.status(500).json({
        message: 'Error al listar registros de inventario',
        error: error.message
      });
    }
  },

  async getRecordById(req, res) {
    try {
      const { recordId } = req.params;
      const inventoryRecord = await inventoryModel.getRecordById(recordId);

      if (!inventoryRecord) {
        return res.status(404).json({
          message: 'Registro de inventario no encontrado'
        });
      }

      res.json({ inventoryRecord });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      if (error.code === '42703') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 023 para guardar factura, proveedor y documento.'
        });
      }

      console.error('Error obteniendo registro de inventario:', error);
      res.status(500).json({
        message: 'Error al obtener el registro de inventario',
        error: error.message
      });
    }
  },

  async createRecord(req, res) {
    try {
      const pipaId = normalizeText(req.body.pipa_id);
      const pipa = await inventoryModel.getPipaById(pipaId);

      if (!pipa) {
        return res.status(404).json({
          message: 'Pipa no encontrada'
        });
      }

      const recordData = buildRecordData(req.body, pipa);
      const uploadedDocument = req.files?.[0] || null;
      const validationError = validateRecordData(recordData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      if (uploadedDocument) {
        recordData.documento_nombre_original = uploadedDocument.originalname;
        recordData.documento_tipo_mime = uploadedDocument.mimetype;
        recordData.documento_tamano_bytes = uploadedDocument.size;
        recordData.documento_data = uploadedDocument.buffer;
      }

      const createdRecord = await inventoryModel.createRecord(recordData);
      const inventoryRecord = await inventoryModel.getRecordById(createdRecord.id);

      res.status(201).json({
        message: 'Registro de inventario creado correctamente',
        inventoryRecord
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      if (error.code === '42703') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 023 para guardar factura, proveedor y documento.'
        });
      }

      console.error('Error creando registro de inventario:', error);
      res.status(500).json({
        message: 'Error al crear el registro de inventario',
        error: error.message
      });
    }
  },

  async updateRecord(req, res) {
    try {
      const { recordId } = req.params;
      const existingRecord = await inventoryModel.getRecordById(recordId);

      if (!existingRecord) {
        return res.status(404).json({
          message: 'Registro de inventario no encontrado'
        });
      }

      const pipaId = normalizeText(req.body.pipa_id);
      const pipa = await inventoryModel.getPipaById(pipaId);

      if (!pipa) {
        return res.status(404).json({
          message: 'Pipa no encontrada'
        });
      }

      const recordData = buildRecordData(req.body, pipa);
      const uploadedDocument = req.files?.[0] || null;
      const validationError = validateRecordData(recordData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      recordData.documento_nombre_original = existingRecord.documento_nombre_original || null;
      recordData.documento_tipo_mime = existingRecord.documento_tipo_mime || null;
      recordData.documento_tamano_bytes = existingRecord.documento_tamano_bytes || null;
      recordData.documento_data = null;

      if (uploadedDocument) {
        recordData.documento_nombre_original = uploadedDocument.originalname;
        recordData.documento_tipo_mime = uploadedDocument.mimetype;
        recordData.documento_tamano_bytes = uploadedDocument.size;
        recordData.documento_data = uploadedDocument.buffer;
      }

      await inventoryModel.updateRecordAndRebalance(recordId, recordData, existingRecord);
      const inventoryRecord = await inventoryModel.getRecordById(recordId);

      res.json({
        message: 'Registro de inventario actualizado correctamente',
        inventoryRecord
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      if (error.code === '42703') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 023 para guardar factura, proveedor y documento.'
        });
      }

      if (String(error.message || '').startsWith('La pipa seleccionada no tiene litros suficientes')) {
        return res.status(400).json({ message: error.message });
      }

      console.error('Error actualizando registro de inventario:', error);
      res.status(500).json({
        message: 'Error al actualizar el registro de inventario',
        error: error.message
      });
    }
  },

  async deleteRecord(req, res) {
    try {
      const { recordId } = req.params;
      const deletedRecord = await inventoryModel.deleteRecord(recordId);

      if (!deletedRecord) {
        return res.status(404).json({
          message: 'Registro de inventario no encontrado'
        });
      }

      res.json({
        message: 'Registro de inventario eliminado correctamente'
      });
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 022.'
        });
      }

      console.error('Error eliminando registro de inventario:', error);
      res.status(500).json({
        message: 'Error al eliminar el registro de inventario',
        error: error.message
      });
    }
  },

  async downloadRecordDocument(req, res) {
    try {
      const { recordId } = req.params;
      const file = await inventoryModel.getRecordDocument(recordId);

      if (!file) {
        return res.status(404).json({
          message: 'Documento no encontrado'
        });
      }

      const fileName = file.documento_nombre_original || 'inventario-pipa.bin';
      const mimeType = file.documento_tipo_mime || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      return res.send(file.documento_data);
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El modulo de inventario requiere la migracion 023.'
        });
      }

      console.error('Error descargando documento de inventario:', error);
      res.status(500).json({
        message: 'Error al descargar el documento',
        error: error.message
      });
    }
  }
};
