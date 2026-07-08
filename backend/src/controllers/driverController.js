import { driverModel } from '../models/driverModel.js';
import { cloudinaryService } from '../services/cloudinaryService.js';
import { getDriverRatingWeekRange, getTodayDateString } from '../utils/driverRatingWeek.js';

const DRIVER_DOCUMENT_TYPE_LABELS = {
  1: 'Licencia de conducir',
  2: 'Acto medico',
  3: 'INE o identificacion oficial',
  4: 'R control'
};

const normalizeText = (value) => String(value || '').trim();
const normalizeNullableText = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};

const buildDriverPayload = (body = {}) => ({
  nombre: normalizeText(body.nombre),
  telefono: normalizeText(body.telefono),
  numero_seguro_social: normalizeText(body.numero_seguro_social),
  domicilio: normalizeNullableText(body.domicilio),
  imagen_url: normalizeNullableText(body.imagen_url),
  descripcion: normalizeNullableText(body.descripcion)
});

const validateDriverPayload = (driverData) => {
  if (!driverData.nombre) return 'El nombre del conductor es requerido';
  if (!driverData.telefono) return 'El telefono del conductor es requerido';
  if (!driverData.numero_seguro_social) return 'El numero de seguro social es requerido';
  return null;
};

const buildEmergencyContactPayload = (body = {}) => ({
  nombre: normalizeText(body.nombre),
  parentesco: normalizeText(body.parentesco),
  numero_telefono: normalizeText(body.numero_telefono)
});

const buildDriverDocumentPayload = (body = {}) => ({
  nombre_documento: normalizeText(body.nombre_documento),
  tipo_documento_id: Number.parseInt(body.tipo_documento_id, 10),
  vigencia: normalizeNullableText(body.vigencia),
  observaciones: normalizeNullableText(body.observaciones),
  estatus: normalizeText(body.estatus || 'vigente').toLowerCase()
});

const buildDriverHistoryPayload = (body = {}) => ({
  nombre: normalizeText(body.nombre),
  fecha_registro: normalizeText(body.fecha_registro),
  descripcion: normalizeNullableText(body.descripcion)
});

const buildDriverRatingPayload = (body = {}) => ({
  fecha_registro: normalizeText(body.fecha_registro),
  rating_year: Number.parseInt(body.rating_year, 10),
  week_number: Number.parseInt(body.week_number, 10),
  calificacion: Number.parseFloat(body.calificacion),
  descripcion: normalizeNullableText(body.descripcion)
});

const withDriverDocumentDefaults = (documentData) => ({
  ...documentData,
  nombre_documento:
    documentData.nombre_documento ||
    DRIVER_DOCUMENT_TYPE_LABELS[documentData.tipo_documento_id] ||
    'Documento'
});

const validateEmergencyContactPayload = (contactData) => {
  if (!contactData.nombre) return 'El nombre del contacto es requerido';
  if (!contactData.parentesco) return 'El parentesco es requerido';
  if (!contactData.numero_telefono) return 'El numero del contacto es requerido';
  return null;
};

const validateDriverDocumentPayload = (documentData) => {
  if (![1, 2, 3, 4].includes(documentData.tipo_documento_id)) {
    return 'Selecciona un tipo de documento valido';
  }

  if (documentData.estatus === 'no_aplica') {
    return null;
  }

  if (!documentData.vigencia) {
    return 'La vigencia es requerida cuando el documento si vence';
  }

  return null;
};

const validateDriverHistoryPayload = (historyData) => {
  if (!historyData.nombre) return 'El nombre del registro es requerido';
  if (!historyData.fecha_registro) return 'La fecha del registro es requerida';
  return null;
};

const validateDriverRatingPayload = (ratingData) => {
  if (!Number.isInteger(ratingData.rating_year)) return 'Selecciona un año válido para el rating';
  if (!Number.isInteger(ratingData.week_number) || ratingData.week_number < 1 || ratingData.week_number > 52) {
    return 'Selecciona una semana válida entre la 1 y la 52';
  }
  if (!Number.isFinite(ratingData.calificacion) || ratingData.calificacion <= 0 || ratingData.calificacion > 10) {
    return 'La calificación debe ser mayor que 0 y menor o igual a 10';
  }

  return null;
};

const normalizeDriverRatingPayload = (ratingData) => {
  const weekInfo = getDriverRatingWeekRange(ratingData.rating_year, ratingData.week_number);
  return {
    fecha_registro: ratingData.fecha_registro || getTodayDateString(),
    rating_year: weekInfo.ratingYear,
    week_number: weekInfo.weekNumber,
    semana_inicio: weekInfo.semana_inicio,
    semana_fin: weekInfo.semana_fin,
    calificacion: ratingData.calificacion,
    descripcion: ratingData.descripcion
  };
};

export const driverController = {
  async listDrivers(req, res) {
    try {
      const drivers = await driverModel.listDrivers();
      res.json({ drivers });
    } catch (error) {
      console.error('Error listando conductores:', error);
      res.status(500).json({
        message: 'Error al obtener conductores',
        error: error.message
      });
    }
  },

  async getDriverById(req, res) {
    try {
      const driver = await driverModel.getDriverById(req.params.id);

      if (!driver) {
        return res.status(404).json({ message: 'Conductor no encontrado' });
      }

      const [emergencyContacts, documents, historyRecords, weeklyRatings] = await Promise.all([
        driverModel.listEmergencyContacts(req.params.id),
        driverModel.getDriverDocuments(req.params.id),
        driverModel.listDriverHistory(req.params.id),
        driverModel.listDriverRatings(req.params.id)
      ]);
      res.json({
        ...driver,
        emergencyContacts,
        documents,
        historyRecords,
        weeklyRatings
      });
    } catch (error) {
      console.error('Error obteniendo conductor:', error);
      res.status(500).json({
        message: 'Error al obtener conductor',
        error: error.message
      });
    }
  },

  async createDriver(req, res) {
    try {
      const driverData = buildDriverPayload(req.body);
      const validationError = validateDriverPayload(driverData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const existingDriver = await driverModel.getDriverBySocialSecurityNumber(
        driverData.numero_seguro_social
      );

      if (existingDriver) {
        return res.status(400).json({
          message: 'Ya existe un conductor con ese numero de seguro social'
        });
      }

      if (req.files?.imagen?.[0]) {
        driverData.imagen_url = await cloudinaryService.uploadImage(
          req.files.imagen[0].buffer,
          `driver_${Date.now()}_${driverData.nombre}`,
          { folder: 'verdemex/conductores/fotos' }
        );
      }

      const driver = await driverModel.createDriver(driverData);

      res.status(201).json({
        message: 'Conductor creado correctamente',
        driver
      });
    } catch (error) {
      console.error('Error creando conductor:', error);
      res.status(500).json({
        message: 'Error al crear conductor',
        error: error.message
      });
    }
  },

  async updateDriver(req, res) {
    try {
      const { id } = req.params;
      const existingDriver = await driverModel.getDriverById(id);

      if (!existingDriver) {
        return res.status(404).json({ message: 'Conductor no encontrado' });
      }

      const driverData = buildDriverPayload(req.body);
      const validationError = validateDriverPayload(driverData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const duplicatedNss = await driverModel.getDriverBySocialSecurityNumber(
        driverData.numero_seguro_social,
        id
      );

      if (duplicatedNss) {
        return res.status(400).json({
          message: 'Ya existe otro conductor con ese numero de seguro social'
        });
      }

      if (req.files?.imagen?.[0]) {
        driverData.imagen_url = await cloudinaryService.uploadImage(
          req.files.imagen[0].buffer,
          `driver_${Date.now()}_${driverData.nombre}`,
          { folder: 'verdemex/conductores/fotos' }
        );
      } else {
        driverData.imagen_url = existingDriver.imagen_url || null;
      }

      const updatedDriver = await driverModel.updateDriver(id, driverData);
      res.json({
        message: 'Conductor actualizado correctamente',
        driver: updatedDriver
      });
    } catch (error) {
      console.error('Error actualizando conductor:', error);
      res.status(500).json({
        message: 'Error al actualizar conductor',
        error: error.message
      });
    }
  },

  async createEmergencyContact(req, res) {
    try {
      const { id } = req.params;
      const driver = await driverModel.getDriverById(id);

      if (!driver) {
        return res.status(404).json({ message: 'Conductor no encontrado' });
      }

      const contactData = buildEmergencyContactPayload(req.body);
      const validationError = validateEmergencyContactPayload(contactData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const contact = await driverModel.createEmergencyContact(id, contactData);
      res.status(201).json({
        message: 'Contacto de emergencia creado correctamente',
        contact
      });
    } catch (error) {
      console.error('Error creando contacto de emergencia:', error);
      res.status(500).json({
        message: 'Error al crear contacto de emergencia',
        error: error.message
      });
    }
  },

  async updateEmergencyContact(req, res) {
    try {
      const { id, contactId } = req.params;
      const driver = await driverModel.getDriverById(id);

      if (!driver) {
        return res.status(404).json({ message: 'Conductor no encontrado' });
      }

      const contactData = buildEmergencyContactPayload(req.body);
      const validationError = validateEmergencyContactPayload(contactData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const updatedContact = await driverModel.updateEmergencyContact(id, contactId, contactData);

      if (!updatedContact) {
        return res.status(404).json({ message: 'Contacto de emergencia no encontrado' });
      }

      res.json({
        message: 'Contacto de emergencia actualizado correctamente',
        contact: updatedContact
      });
    } catch (error) {
      console.error('Error actualizando contacto de emergencia:', error);
      res.status(500).json({
        message: 'Error al actualizar contacto de emergencia',
        error: error.message
      });
    }
  },

  async deleteEmergencyContact(req, res) {
    try {
      const { id, contactId } = req.params;
      const deletedContact = await driverModel.deleteEmergencyContact(id, contactId);

      if (!deletedContact) {
        return res.status(404).json({ message: 'Contacto de emergencia no encontrado' });
      }

      res.json({
        message: 'Contacto de emergencia eliminado correctamente'
      });
    } catch (error) {
      console.error('Error eliminando contacto de emergencia:', error);
      res.status(500).json({
        message: 'Error al eliminar contacto de emergencia',
        error: error.message
      });
    }
  },

  async getDocumentById(req, res) {
    try {
      const { id, docId } = req.params;
      const document = await driverModel.getDriverDocumentById(id, docId);

      if (!document) {
        return res.status(404).json({ message: 'Documento no encontrado' });
      }

      res.json(document);
    } catch (error) {
      console.error('Error obteniendo documento de conductor:', error);
      res.status(500).json({
        message: 'Error al obtener documento',
        error: error.message
      });
    }
  },

  async createDocument(req, res) {
    try {
      const { id } = req.params;
      const driver = await driverModel.getDriverById(id);

      if (!driver) {
        return res.status(404).json({ message: 'Conductor no encontrado' });
      }

      const documentData = withDriverDocumentDefaults(buildDriverDocumentPayload(req.body));
      const validationError = validateDriverDocumentPayload(documentData);
      if (validationError) {
        console.error('Validacion de documento de conductor fallida:', {
          driverId: id,
          body: req.body,
          validationError
        });
        return res.status(400).json({ message: validationError });
      }

      if (documentData.estatus === 'no_aplica') {
        documentData.vigencia = null;
      }

      const document = await driverModel.createDriverDocument(id, documentData);

      if (req.files?.length) {
        await driverModel.addDriverDocumentFiles(document.id, req.files);
      }

      const createdDocument = await driverModel.getDriverDocumentById(id, document.id);
      res.status(201).json({
        message: 'Documento creado correctamente',
        document: createdDocument
      });
    } catch (error) {
      console.error('Error creando documento de conductor:', error);
      res.status(500).json({
        message: 'Error al crear documento',
        error: error.message
      });
    }
  },

  async updateDocument(req, res) {
    try {
      const { id, docId } = req.params;
      const existingDocument = await driverModel.getDriverDocumentById(id, docId);

      if (!existingDocument) {
        return res.status(404).json({ message: 'Documento no encontrado' });
      }

      const documentData = withDriverDocumentDefaults(buildDriverDocumentPayload(req.body));
      const validationError = validateDriverDocumentPayload(documentData);
      if (validationError) {
        console.error('Validacion de actualizacion de documento de conductor fallida:', {
          driverId: id,
          docId,
          body: req.body,
          validationError
        });
        return res.status(400).json({ message: validationError });
      }

      if (documentData.estatus === 'no_aplica') {
        documentData.vigencia = null;
      }

      await driverModel.updateDriverDocument(id, docId, documentData);

      if (req.files?.length) {
        await driverModel.addDriverDocumentFiles(docId, req.files);
      }

      const updatedDocument = await driverModel.getDriverDocumentById(id, docId);
      res.json({
        message: 'Documento actualizado correctamente',
        document: updatedDocument
      });
    } catch (error) {
      console.error('Error actualizando documento de conductor:', error);
      res.status(500).json({
        message: 'Error al actualizar documento',
        error: error.message
      });
    }
  },

  async deleteDocument(req, res) {
    try {
      const { id, docId } = req.params;
      const deletedDocument = await driverModel.deleteDriverDocument(id, docId);

      if (!deletedDocument) {
        return res.status(404).json({ message: 'Documento no encontrado' });
      }

      res.json({ message: 'Documento eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando documento de conductor:', error);
      res.status(500).json({
        message: 'Error al eliminar documento',
        error: error.message
      });
    }
  },

  async deleteDocumentFile(req, res) {
    try {
      const { id, docId, fileId } = req.params;
      const deletedFile = await driverModel.deleteDriverDocumentFile(docId, fileId);

      if (!deletedFile) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }

      const updatedDocument = await driverModel.getDriverDocumentById(id, docId);
      res.json({
        message: 'Archivo eliminado correctamente',
        document: updatedDocument
      });
    } catch (error) {
      console.error('Error eliminando archivo de documento:', error);
      res.status(500).json({
        message: 'Error al eliminar archivo',
        error: error.message
      });
    }
  },

  async downloadDocument(req, res) {
    try {
      const { id, docId } = req.params;
      const parsedIndex = Number.parseInt(req.query.fileIndex ?? '0', 10);
      const fileIndex = Number.isNaN(parsedIndex) || parsedIndex < 0 ? 0 : parsedIndex;
      const selectedFile = await driverModel.getDriverDocumentFileByIndex(id, docId, fileIndex);

      if (!selectedFile?.archivo_data) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }

      const fileName = selectedFile.nombre_original || 'documento';
      const fileSize = Buffer.isBuffer(selectedFile.archivo_data)
        ? selectedFile.archivo_data.length
        : selectedFile.tamano_bytes || 0;

      res.setHeader('Content-Type', selectedFile.tipo_mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileSize);
      return res.send(selectedFile.archivo_data);
    } catch (error) {
      console.error('Error descargando documento de conductor:', error);
      res.status(500).json({
        message: 'Error al descargar documento',
        error: error.message
      });
    }
  },

  async getHistoryById(req, res) {
    try {
      const { id, historyId } = req.params;
      const historyEntry = await driverModel.getDriverHistoryById(id, historyId);

      if (!historyEntry) {
        return res.status(404).json({ message: 'Registro de historial no encontrado' });
      }

      res.json(historyEntry);
    } catch (error) {
      console.error('Error obteniendo historial de conductor:', error);
      res.status(500).json({
        message: 'Error al obtener historial',
        error: error.message
      });
    }
  },

  async createHistory(req, res) {
    try {
      const { id } = req.params;
      const driver = await driverModel.getDriverById(id);

      if (!driver) {
        return res.status(404).json({ message: 'Conductor no encontrado' });
      }

      const historyData = buildDriverHistoryPayload(req.body);
      const validationError = validateDriverHistoryPayload(historyData);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const historyEntry = await driverModel.createDriverHistory(id, historyData);
      if (req.files?.length) {
        await driverModel.addDriverHistoryFiles(historyEntry.id, req.files);
      }

      const createdHistory = await driverModel.getDriverHistoryById(id, historyEntry.id);
      res.status(201).json({
        message: 'Registro de historial creado correctamente',
        history: createdHistory
      });
    } catch (error) {
      console.error('Error creando historial de conductor:', error);
      res.status(500).json({
        message: 'Error al crear historial',
        error: error.message
      });
    }
  },

  async updateHistory(req, res) {
    try {
      const { id, historyId } = req.params;
      const existingHistory = await driverModel.getDriverHistoryById(id, historyId);

      if (!existingHistory) {
        return res.status(404).json({ message: 'Registro de historial no encontrado' });
      }

      const historyData = buildDriverHistoryPayload(req.body);
      const validationError = validateDriverHistoryPayload(historyData);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      await driverModel.updateDriverHistory(id, historyId, historyData);
      if (req.files?.length) {
        await driverModel.addDriverHistoryFiles(historyId, req.files);
      }

      const updatedHistory = await driverModel.getDriverHistoryById(id, historyId);
      res.json({
        message: 'Registro de historial actualizado correctamente',
        history: updatedHistory
      });
    } catch (error) {
      console.error('Error actualizando historial de conductor:', error);
      res.status(500).json({
        message: 'Error al actualizar historial',
        error: error.message
      });
    }
  },

  async deleteHistory(req, res) {
    try {
      const { id, historyId } = req.params;
      const deletedHistory = await driverModel.deleteDriverHistory(id, historyId);

      if (!deletedHistory) {
        return res.status(404).json({ message: 'Registro de historial no encontrado' });
      }

      res.json({ message: 'Registro de historial eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando historial de conductor:', error);
      res.status(500).json({
        message: 'Error al eliminar historial',
        error: error.message
      });
    }
  },

  async deleteHistoryFile(req, res) {
    try {
      const { id, historyId, fileId } = req.params;
      const deletedFile = await driverModel.deleteDriverHistoryFile(historyId, fileId);

      if (!deletedFile) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }

      const updatedHistory = await driverModel.getDriverHistoryById(id, historyId);
      res.json({
        message: 'Archivo eliminado correctamente',
        history: updatedHistory
      });
    } catch (error) {
      console.error('Error eliminando archivo de historial:', error);
      res.status(500).json({
        message: 'Error al eliminar archivo',
        error: error.message
      });
    }
  },

  async downloadHistoryFile(req, res) {
    try {
      const { id, historyId } = req.params;
      const parsedIndex = Number.parseInt(req.query.fileIndex ?? '0', 10);
      const fileIndex = Number.isNaN(parsedIndex) || parsedIndex < 0 ? 0 : parsedIndex;
      const selectedFile = await driverModel.getDriverHistoryFileByIndex(id, historyId, fileIndex);

      if (!selectedFile?.archivo_data) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }

      const fileName = selectedFile.nombre_original || 'historial';
      const fileSize = Buffer.isBuffer(selectedFile.archivo_data)
        ? selectedFile.archivo_data.length
        : selectedFile.tamano_bytes || 0;

      res.setHeader('Content-Type', selectedFile.tipo_mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileSize);
      return res.send(selectedFile.archivo_data);
    } catch (error) {
      console.error('Error descargando archivo de historial:', error);
      res.status(500).json({
        message: 'Error al descargar archivo',
        error: error.message
      });
    }
  },

  async getRatingById(req, res) {
    try {
      const { id, ratingId } = req.params;
      const ratingEntry = await driverModel.getDriverRatingById(id, ratingId);

      if (!ratingEntry) {
        return res.status(404).json({ message: 'Rating no encontrado' });
      }

      res.json(ratingEntry);
    } catch (error) {
      console.error('Error obteniendo rating de conductor:', error);
      res.status(500).json({
        message: 'Error al obtener rating',
        error: error.message
      });
    }
  },

  async createRating(req, res) {
    try {
      const { id } = req.params;
      const driver = await driverModel.getDriverById(id);

      if (!driver) {
        return res.status(404).json({ message: 'Conductor no encontrado' });
      }

      const ratingData = buildDriverRatingPayload(req.body);
      const validationError = validateDriverRatingPayload(ratingData);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const normalizedRating = normalizeDriverRatingPayload(ratingData);
      const duplicatedRating = await driverModel.getDriverRatingByWeek(
        id,
        normalizedRating.rating_year,
        normalizedRating.week_number
      );

      if (duplicatedRating) {
        return res.status(400).json({
          message: `Ya existe un rating para la semana ${normalizedRating.week_number} del anio ${normalizedRating.rating_year}`
        });
      }

      const ratingEntry = await driverModel.createDriverRating(id, normalizedRating);
      if (req.files?.length) {
        await driverModel.addDriverRatingFiles(ratingEntry.id, req.files);
      }

      const createdRating = await driverModel.getDriverRatingById(id, ratingEntry.id);
      res.status(201).json({
        message: 'Rating creado correctamente',
        rating: createdRating
      });
    } catch (error) {
      console.error('Error creando rating de conductor:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          message: 'Ya existe un rating para esa semana en este conductor'
        });
      }
      res.status(500).json({
        message: 'Error al crear rating',
        error: error.message
      });
    }
  },

  async updateRating(req, res) {
    try {
      const { id, ratingId } = req.params;
      const existingRating = await driverModel.getDriverRatingById(id, ratingId);

      if (!existingRating) {
        return res.status(404).json({ message: 'Rating no encontrado' });
      }

      const ratingData = buildDriverRatingPayload(req.body);
      const validationError = validateDriverRatingPayload(ratingData);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const normalizedRating = normalizeDriverRatingPayload({
        ...ratingData,
        fecha_registro: ratingData.fecha_registro || existingRating.fecha_registro
      });
      const duplicatedRating = await driverModel.getDriverRatingByWeek(
        id,
        normalizedRating.rating_year,
        normalizedRating.week_number,
        ratingId
      );

      if (duplicatedRating) {
        return res.status(400).json({
          message: `Ya existe un rating para la semana ${normalizedRating.week_number} del anio ${normalizedRating.rating_year}`
        });
      }

      await driverModel.updateDriverRating(id, ratingId, normalizedRating);
      if (req.files?.length) {
        await driverModel.addDriverRatingFiles(ratingId, req.files);
      }

      const updatedRating = await driverModel.getDriverRatingById(id, ratingId);
      res.json({
        message: 'Rating actualizado correctamente',
        rating: updatedRating
      });
    } catch (error) {
      console.error('Error actualizando rating de conductor:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          message: 'Ya existe un rating para esa semana en este conductor'
        });
      }
      res.status(500).json({
        message: 'Error al actualizar rating',
        error: error.message
      });
    }
  },

  async deleteRating(req, res) {
    try {
      const { id, ratingId } = req.params;
      const deletedRating = await driverModel.deleteDriverRating(id, ratingId);

      if (!deletedRating) {
        return res.status(404).json({ message: 'Rating no encontrado' });
      }

      res.json({ message: 'Rating eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando rating de conductor:', error);
      res.status(500).json({
        message: 'Error al eliminar rating',
        error: error.message
      });
    }
  },

  async deleteRatingFile(req, res) {
    try {
      const { id, ratingId, fileId } = req.params;
      const deletedFile = await driverModel.deleteDriverRatingFile(ratingId, fileId);

      if (!deletedFile) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }

      const updatedRating = await driverModel.getDriverRatingById(id, ratingId);
      res.json({
        message: 'Archivo eliminado correctamente',
        rating: updatedRating
      });
    } catch (error) {
      console.error('Error eliminando archivo de rating:', error);
      res.status(500).json({
        message: 'Error al eliminar archivo',
        error: error.message
      });
    }
  },

  async downloadRatingFile(req, res) {
    try {
      const { id, ratingId } = req.params;
      const parsedIndex = Number.parseInt(req.query.fileIndex ?? '0', 10);
      const fileIndex = Number.isNaN(parsedIndex) || parsedIndex < 0 ? 0 : parsedIndex;
      const selectedFile = await driverModel.getDriverRatingFileByIndex(id, ratingId, fileIndex);

      if (!selectedFile?.archivo_data) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }

      const fileName = selectedFile.nombre_original || 'rating';
      const fileSize = Buffer.isBuffer(selectedFile.archivo_data)
        ? selectedFile.archivo_data.length
        : selectedFile.tamano_bytes || 0;

      res.setHeader('Content-Type', selectedFile.tipo_mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileSize);
      return res.send(selectedFile.archivo_data);
    } catch (error) {
      console.error('Error descargando archivo de rating:', error);
      res.status(500).json({
        message: 'Error al descargar archivo',
        error: error.message
      });
    }
  }
};
