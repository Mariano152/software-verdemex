import { vehicleModel } from '../models/vehicleModel.js';
import { cloudinaryService } from '../services/cloudinaryService.js';

const extractFileList = (document) => {
  if (!document?.archivos_json) {
    return [];
  }

  try {
    const parsed = typeof document.archivos_json === 'string'
      ? JSON.parse(document.archivos_json)
      : document.archivos_json;

    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.warn('⚠️ No se pudo parsear archivos_json:', error.message);
    return [];
  }
};

const isRemoteUrl = (value = '') => /^https?:\/\//i.test(value);
const VALID_VEHICLE_STATES = ['activo', 'inactivo', 'en_mantenimiento'];
const VEHICLE_PHOTO_TYPES = [
  'frente', 'parte_trasera', 'lado_piloto', 'lado_copiloto',
  'senales_y_luces', 'estrobos', 'extintor', 'rotulacion',
  'torreta', 'proteccion_antiderrames', 'equipo_comunicacion',
  'arnes_y_conectores', 'equipo_proteccion_personal'
];

export const vehicleController = {
  // Crear vehículo con toda la información
  async createVehicle(req, res) {
    try {
      // Parsear datos que vienen en FormData
      let basicInfo = {};
      let documents = [];
      let safetyElements = [];

      // Los campos del RF1 vienen directamente en req.body
      basicInfo = {
        propietario_nombre: req.body.propietario_nombre,
        placa: req.body.placa,
        numero_serie: req.body.numero_serie,
        marca: req.body.marca,
        modelo: req.body.modelo,
        color: req.body.color,
        capacidad_kg: req.body.capacidad_kg,
        descripcion: req.body.descripcion
      };

      console.log('📥 Datos RF1 recibidos:', basicInfo);

      // ✅ VALIDACIONES - Solo PASO 1 es requerido
      const missingFields = [];
      
      if (!basicInfo.propietario_nombre?.trim()) missingFields.push('Nombre del Propietario');
      if (!basicInfo.placa?.trim()) missingFields.push('Placa');
      if (!basicInfo.numero_serie?.trim()) missingFields.push('Número de Serie');
      if (!basicInfo.marca?.trim()) missingFields.push('Marca');
      if (!basicInfo.modelo) missingFields.push('Modelo (Año)');

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: 'Faltan campos requeridos',
          missingFields
        });
      }

      // Validación: Modelo entre 1900 y 2100
      if (basicInfo.modelo < 1900 || basicInfo.modelo > 2100) {
        return res.status(400).json({
          message: 'Modelo debe estar entre 1900 y 2100'
        });
      }

      // Verificar duplicados
      const duplicates = await vehicleModel.checkDuplicates(basicInfo.placa, basicInfo.numero_serie);
      if (duplicates.length > 0) {
        return res.status(400).json({
          message: 'Placa o número de serie ya existen',
          duplicates
        });
      }

      // 1. Procesar imagen principal (RF1)
      let imagenUrl = null;
      if (req.files && req.files.imagen) {
        const file = req.files.imagen[0];
        try {
          console.log('📤 Subiendo imagen a Cloudinary...');
          imagenUrl = await cloudinaryService.uploadImage(
            file.buffer,
            `vehicle_main_${Date.now()}`
          );
          console.log('✅ Imagen subida:', imagenUrl);
          basicInfo.imagen_url = imagenUrl;
        } catch (uploadError) {
          console.error('❌ Error subiendo imagen:', uploadError.message);
          throw new Error('No se pudo subir la imagen a Cloudinary');
        }
      }

      // 2. Crear vehículo
      const vehicle = await vehicleModel.createVehicle(basicInfo);
      console.log('✅ Vehículo creado:', vehicle.id);

      // 2.5. Guardar imagen principal en tabla de fotografías (si existe)
      if (imagenUrl) {
        try {
          await vehicleModel.createPhoto(vehicle.id, {
            tipo_foto: 'principal',
            archivo_url: imagenUrl,
            descripcion: 'Fotografía principal del vehículo',
            categoria: 'principal'
          });
          console.log('✅ Imagen principal guardada en fotografías');
        } catch (photoError) {
          console.error('⚠️ Error guardando imagen en fotografías:', photoError.message);
        }
      }

      // 3. Crear documentos (OPCIONAL - si existen)
      if (documents && Array.isArray(documents) && documents.length > 0) {
        for (const doc of documents) {
          if (doc.tipo_documento_id) {
            try {
              await vehicleModel.createDocument(vehicle.id, doc);
            } catch (docError) {
              console.error('⚠️ Error guardando documento:', docError.message);
            }
          }
        }
        console.log(`✅ ${documents.filter(d => d.tipo_documento_id).length} documentos creados`);
      }

      // 4. Crear elementos de seguridad (OPCIONAL - si existen)
      if (safetyElements && Array.isArray(safetyElements) && safetyElements.length > 0) {
        for (const element of safetyElements) {
          if (element.id) {
            try {
              await vehicleModel.createSafetyElement(vehicle.id, {
                elemento_seguridad_id: element.id,
                estatus: element.estatus,
                observaciones: element.observaciones
              });
            } catch (elemError) {
              console.error('⚠️ Error guardando elemento:', elemError.message);
            }
          }
        }
        console.log(`✅ ${safetyElements.filter(e => e.id).length} elementos de seguridad creados`);
      }

      // 5. Procesar fotos adicionales (OPCIONAL - sin fotos está bien)
      let uploadedPhotos = 0;

      for (const photoType of VEHICLE_PHOTO_TYPES) {
        if (req.files && req.files[photoType]) {
          const file = req.files[photoType][0];
          
          try {
            // Subir a Cloudinary
            const cloudinaryUrl = await cloudinaryService.uploadImage(
              file.buffer,
              `vehicle_${vehicle.id}_${photoType}_${Date.now()}`
            );

            // Guardar en BD
            await vehicleModel.createPhoto(vehicle.id, {
              tipo_foto: photoType,
              archivo_url: cloudinaryUrl,
              descripcion: req.body[`descripcion_${photoType}`] || '',
              categoria: 'general'
            });

            uploadedPhotos++;
            console.log(`✅ Foto upload: ${photoType} → Cloudinary`);
          } catch (photoError) {
            console.error(`⚠️ Error subiendo foto ${photoType}:`, photoError.message);
            // Continuar con siguientes fotos
          }
        }
      }

      // 5. Retornar vehículo completo
      const completeVehicle = await vehicleModel.getVehicleById(vehicle.id);

      res.status(201).json({
        message: 'Vehículo registrado correctamente',
        vehicle: {
          ...completeVehicle,
          documents: completeVehicle.documentos || [],
          maintenanceRecords: completeVehicle.mantenimientos || [],
          gasolineRecords: completeVehicle.gasolina_registros || [],
          safetyElements: completeVehicle.elementos_seguridad || [],
          photos: completeVehicle.fotografias || []
        },
        summary: {
          basicInfoComplete: true,
          documentsCreated: documents?.filter(d => d.tipo_documento_id).length || 0,
          safetyElementsCreated: safetyElements?.filter(e => e.id).length || 0,
          photosUploaded: uploadedPhotos
        }
      });

    } catch (error) {
      console.error('❌ Error creando vehículo:', error);
      res.status(500).json({
        message: 'Error al crear vehículo',
        error: error.message
      });
    }
  },

  // Obtener vehículo por ID
  async getVehicleById(req, res) {
    try {
      const { id } = req.params;
      const vehicle = await vehicleModel.getVehicleById(id);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado'
        });
      }

      // Normalizar respuesta a camelCase para frontend
      res.json({
        ...vehicle,
        documents: vehicle.documentos || [],
        maintenanceRecords: vehicle.mantenimientos || [],
        gasolineRecords: vehicle.gasolina_registros || [],
        safetyElements: vehicle.elementos_seguridad || [],
        photos: vehicle.fotografias || []
      });
    } catch (error) {
      console.error('Error obteniendo vehículo:', error);
      res.status(500).json({
        message: 'Error al obtener vehículo',
        error: error.message
      });
    }
  },

  async getSafetyElements(req, res) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado'
        });
      }

      const safetyElements = await vehicleModel.getSafetyElementsByVehicleId(vehicleId);

      res.json({
        vehicleId,
        vehicleStatus: vehicle.estado || 'activo',
        safetyElements
      });
    } catch (error) {
      console.error('Error obteniendo elementos de seguridad:', error);
      res.status(500).json({
        message: 'Error al obtener elementos de seguridad',
        error: error.message
      });
    }
  },

  async getMaintenanceRecordById(req, res) {
    try {
      const { vehicleId, maintenanceId } = req.params;
      const maintenanceRecord = await vehicleModel.getMaintenanceRecordById(vehicleId, maintenanceId);

      if (!maintenanceRecord) {
        return res.status(404).json({
          message: 'Registro de mantenimiento no encontrado'
        });
      }

      const fileRows = await vehicleModel.getMaintenanceFilesMetadata(maintenanceId);

      res.json({
        ...maintenanceRecord,
        archivos_json: JSON.stringify(fileRows.map((fileRow, index) => ({
          id: fileRow.id,
          nombre_original: fileRow.nombre_original,
          tipo_mime: fileRow.tipo_mime,
          tamano: Number(fileRow.tamano_bytes || 0),
          tamano_bytes: Number(fileRow.tamano_bytes || 0),
          orden: fileRow.orden ?? index + 1,
          download_url: `/api/vehicles/${vehicleId}/maintenance-records/${maintenanceId}/download?fileIndex=${index}`
        })))
      });
    } catch (error) {
      console.error('Error obteniendo registro de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al obtener registro de mantenimiento',
        error: error.message
      });
    }
  },

  async createMaintenanceRecord(req, res) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado'
        });
      }

      const maintenanceData = {
        titulo: req.body.titulo?.trim(),
        tipo_mantenimiento: req.body.tipo_mantenimiento?.trim(),
        fecha_servicio: req.body.fecha_servicio,
        costo: Number(req.body.costo || 0),
        proveedor: req.body.proveedor?.trim() || '',
        descripcion: req.body.descripcion?.trim() || '',
        observaciones: req.body.observaciones?.trim() || ''
      };

      if (!maintenanceData.titulo || !maintenanceData.tipo_mantenimiento || !maintenanceData.fecha_servicio) {
        return res.status(400).json({
          message: 'Título, tipo de mantenimiento y fecha de servicio son requeridos'
        });
      }

      const maintenanceRecord = await vehicleModel.createMaintenanceRecord(vehicleId, maintenanceData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addMaintenanceFiles(maintenanceRecord.id, req.files);
      }

      const createdRecord = await vehicleController.getMaintenanceRecordPayload(vehicleId, maintenanceRecord.id);

      res.status(201).json({
        message: 'Registro de mantenimiento creado correctamente',
        maintenanceRecord: createdRecord
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de mantenimiento aún no está disponible en la base de datos. Ejecuta la migración 013.'
        });
      }
      console.error('Error creando registro de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al crear registro de mantenimiento',
        error: error.message
      });
    }
  },

  async updateMaintenanceRecord(req, res) {
    try {
      const { vehicleId, maintenanceId } = req.params;
      const existingRecord = await vehicleModel.getMaintenanceRecordById(vehicleId, maintenanceId);

      if (!existingRecord) {
        return res.status(404).json({
          message: 'Registro de mantenimiento no encontrado'
        });
      }

      const maintenanceData = {
        titulo: req.body.titulo?.trim(),
        tipo_mantenimiento: req.body.tipo_mantenimiento?.trim(),
        fecha_servicio: req.body.fecha_servicio,
        costo: Number(req.body.costo || 0),
        proveedor: req.body.proveedor?.trim() || '',
        descripcion: req.body.descripcion?.trim() || '',
        observaciones: req.body.observaciones?.trim() || ''
      };

      if (!maintenanceData.titulo || !maintenanceData.tipo_mantenimiento || !maintenanceData.fecha_servicio) {
        return res.status(400).json({
          message: 'Título, tipo de mantenimiento y fecha de servicio son requeridos'
        });
      }

      await vehicleModel.updateMaintenanceRecord(vehicleId, maintenanceId, maintenanceData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addMaintenanceFiles(maintenanceId, req.files);
      }

      const updatedRecord = await vehicleController.getMaintenanceRecordPayload(vehicleId, maintenanceId);

      res.json({
        message: 'Registro de mantenimiento actualizado correctamente',
        maintenanceRecord: updatedRecord
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de mantenimiento aún no está disponible en la base de datos. Ejecuta la migración 013.'
        });
      }
      console.error('Error actualizando registro de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al actualizar registro de mantenimiento',
        error: error.message
      });
    }
  },

  async deleteMaintenanceRecord(req, res) {
    try {
      const { vehicleId, maintenanceId } = req.params;
      const deletedRecord = await vehicleModel.deleteMaintenanceRecord(vehicleId, maintenanceId);

      if (!deletedRecord) {
        return res.status(404).json({
          message: 'Registro de mantenimiento no encontrado'
        });
      }

      res.json({
        message: 'Registro de mantenimiento eliminado correctamente'
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de mantenimiento aún no está disponible en la base de datos. Ejecuta la migración 013.'
        });
      }
      console.error('Error eliminando registro de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al eliminar registro de mantenimiento',
        error: error.message
      });
    }
  },

  async downloadMaintenanceFile(req, res) {
    try {
      const { vehicleId, maintenanceId } = req.params;
      const parsedIndex = Number.parseInt(req.query.fileIndex ?? '0', 10);
      const fileIndex = Number.isNaN(parsedIndex) || parsedIndex < 0 ? 0 : parsedIndex;

      const selectedFile = await vehicleModel.getMaintenanceFileByIndex(vehicleId, maintenanceId, fileIndex);
      if (!selectedFile?.archivo_data) {
        return res.status(404).json({
          message: 'Archivo de mantenimiento no encontrado'
        });
      }

      const fileName = selectedFile.nombre_original || 'mantenimiento.bin';
      const fileSize = Buffer.isBuffer(selectedFile.archivo_data)
        ? selectedFile.archivo_data.length
        : selectedFile.tamano_bytes || 0;

      res.setHeader('Content-Type', selectedFile.tipo_mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileSize);
      return res.send(selectedFile.archivo_data);
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de mantenimiento aún no está disponible en la base de datos. Ejecuta la migración 013.'
        });
      }
      console.error('Error descargando archivo de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al descargar archivo de mantenimiento',
        error: error.message
      });
    }
  },

  async deleteMaintenanceFile(req, res) {
    try {
      const { vehicleId, maintenanceId, fileId } = req.params;
      const maintenanceRecord = await vehicleModel.getMaintenanceRecordById(vehicleId, maintenanceId);

      if (!maintenanceRecord) {
        return res.status(404).json({
          message: 'Registro de mantenimiento no encontrado'
        });
      }

      const deletedFile = await vehicleModel.deleteMaintenanceFile(maintenanceId, fileId);

      if (!deletedFile) {
        return res.status(404).json({
          message: 'Archivo no encontrado'
        });
      }

      const updatedRecord = await vehicleController.getMaintenanceRecordPayload(vehicleId, maintenanceId);

      res.json({
        message: 'Archivo eliminado correctamente',
        maintenanceRecord: updatedRecord
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de mantenimiento aún no está disponible en la base de datos. Ejecuta la migración 013.'
        });
      }
      console.error('Error eliminando archivo de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al eliminar archivo de mantenimiento',
        error: error.message
      });
    }
  },

  async getGasolineRecordById(req, res) {
    try {
      const { vehicleId, gasolineId } = req.params;
      const gasolineRecord = await vehicleModel.getGasolineRecordById(vehicleId, gasolineId);

      if (!gasolineRecord) {
        return res.status(404).json({
          message: 'Registro de gasolina no encontrado'
        });
      }

      const fileRows = await vehicleModel.getGasolineFilesMetadata(gasolineId);

      res.json({
        ...gasolineRecord,
        archivos_json: JSON.stringify(fileRows.map((fileRow, index) => ({
          id: fileRow.id,
          nombre_original: fileRow.nombre_original,
          tipo_mime: fileRow.tipo_mime,
          tamano: Number(fileRow.tamano_bytes || 0),
          tamano_bytes: Number(fileRow.tamano_bytes || 0),
          orden: fileRow.orden ?? index + 1,
          download_url: `/api/vehicles/${vehicleId}/gasoline-records/${gasolineId}/download?fileIndex=${index}`
        })))
      });
    } catch (error) {
      console.error('Error obteniendo registro de gasolina:', error);
      res.status(500).json({
        message: 'Error al obtener registro de gasolina',
        error: error.message
      });
    }
  },

  async createGasolineRecord(req, res) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'VehÃ­culo no encontrado'
        });
      }

      const gasolineData = {
        titulo: req.body.titulo?.trim(),
        tipo_combustible: req.body.tipo_combustible?.trim(),
        fecha_carga: req.body.fecha_carga,
        costo_total: Number(req.body.costo_total || 0),
        litros: Number(req.body.litros || 0),
        proveedor: req.body.proveedor?.trim() || '',
        descripcion: req.body.descripcion?.trim() || '',
        observaciones: req.body.observaciones?.trim() || ''
      };

      if (!gasolineData.titulo || !gasolineData.tipo_combustible || !gasolineData.fecha_carga) {
        return res.status(400).json({
          message: 'TÃ­tulo, tipo de combustible y fecha de carga son requeridos'
        });
      }

      if (gasolineData.costo_total < 0 || gasolineData.litros <= 0) {
        return res.status(400).json({
          message: 'El costo total debe ser mayor o igual a 0 y los litros deben ser mayores a 0'
        });
      }

      const gasolineRecord = await vehicleModel.createGasolineRecord(vehicleId, gasolineData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addGasolineFiles(gasolineRecord.id, req.files);
      }

      const createdRecord = await vehicleController.getGasolineRecordPayload(vehicleId, gasolineRecord.id);

      res.status(201).json({
        message: 'Registro de gasolina creado correctamente',
        gasolineRecord: createdRecord
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de gasolina aÃºn no estÃ¡ disponible en la base de datos. Ejecuta la migraciÃ³n 014.'
        });
      }
      console.error('Error creando registro de gasolina:', error);
      res.status(500).json({
        message: 'Error al crear registro de gasolina',
        error: error.message
      });
    }
  },

  async updateGasolineRecord(req, res) {
    try {
      const { vehicleId, gasolineId } = req.params;
      const existingRecord = await vehicleModel.getGasolineRecordById(vehicleId, gasolineId);

      if (!existingRecord) {
        return res.status(404).json({
          message: 'Registro de gasolina no encontrado'
        });
      }

      const gasolineData = {
        titulo: req.body.titulo?.trim(),
        tipo_combustible: req.body.tipo_combustible?.trim(),
        fecha_carga: req.body.fecha_carga,
        costo_total: Number(req.body.costo_total || 0),
        litros: Number(req.body.litros || 0),
        proveedor: req.body.proveedor?.trim() || '',
        descripcion: req.body.descripcion?.trim() || '',
        observaciones: req.body.observaciones?.trim() || ''
      };

      if (!gasolineData.titulo || !gasolineData.tipo_combustible || !gasolineData.fecha_carga) {
        return res.status(400).json({
          message: 'TÃ­tulo, tipo de combustible y fecha de carga son requeridos'
        });
      }

      if (gasolineData.costo_total < 0 || gasolineData.litros <= 0) {
        return res.status(400).json({
          message: 'El costo total debe ser mayor o igual a 0 y los litros deben ser mayores a 0'
        });
      }

      await vehicleModel.updateGasolineRecord(vehicleId, gasolineId, gasolineData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addGasolineFiles(gasolineId, req.files);
      }

      const updatedRecord = await vehicleController.getGasolineRecordPayload(vehicleId, gasolineId);

      res.json({
        message: 'Registro de gasolina actualizado correctamente',
        gasolineRecord: updatedRecord
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de gasolina aÃºn no estÃ¡ disponible en la base de datos. Ejecuta la migraciÃ³n 014.'
        });
      }
      console.error('Error actualizando registro de gasolina:', error);
      res.status(500).json({
        message: 'Error al actualizar registro de gasolina',
        error: error.message
      });
    }
  },

  async deleteGasolineRecord(req, res) {
    try {
      const { vehicleId, gasolineId } = req.params;
      const deletedRecord = await vehicleModel.deleteGasolineRecord(vehicleId, gasolineId);

      if (!deletedRecord) {
        return res.status(404).json({
          message: 'Registro de gasolina no encontrado'
        });
      }

      res.json({
        message: 'Registro de gasolina eliminado correctamente'
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de gasolina aÃºn no estÃ¡ disponible en la base de datos. Ejecuta la migraciÃ³n 014.'
        });
      }
      console.error('Error eliminando registro de gasolina:', error);
      res.status(500).json({
        message: 'Error al eliminar registro de gasolina',
        error: error.message
      });
    }
  },

  async downloadGasolineFile(req, res) {
    try {
      const { vehicleId, gasolineId } = req.params;
      const parsedIndex = Number.parseInt(req.query.fileIndex ?? '0', 10);
      const fileIndex = Number.isNaN(parsedIndex) || parsedIndex < 0 ? 0 : parsedIndex;

      const selectedFile = await vehicleModel.getGasolineFileByIndex(vehicleId, gasolineId, fileIndex);
      if (!selectedFile?.archivo_data) {
        return res.status(404).json({
          message: 'Archivo de gasolina no encontrado'
        });
      }

      const fileName = selectedFile.nombre_original || 'gasolina.bin';
      const fileSize = Buffer.isBuffer(selectedFile.archivo_data)
        ? selectedFile.archivo_data.length
        : selectedFile.tamano_bytes || 0;

      res.setHeader('Content-Type', selectedFile.tipo_mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileSize);
      return res.send(selectedFile.archivo_data);
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de gasolina aÃºn no estÃ¡ disponible en la base de datos. Ejecuta la migraciÃ³n 014.'
        });
      }
      console.error('Error descargando archivo de gasolina:', error);
      res.status(500).json({
        message: 'Error al descargar archivo de gasolina',
        error: error.message
      });
    }
  },

  async deleteGasolineFile(req, res) {
    try {
      const { vehicleId, gasolineId, fileId } = req.params;
      const gasolineRecord = await vehicleModel.getGasolineRecordById(vehicleId, gasolineId);

      if (!gasolineRecord) {
        return res.status(404).json({
          message: 'Registro de gasolina no encontrado'
        });
      }

      const deletedFile = await vehicleModel.deleteGasolineFile(gasolineId, fileId);

      if (!deletedFile) {
        return res.status(404).json({
          message: 'Archivo no encontrado'
        });
      }

      const updatedRecord = await vehicleController.getGasolineRecordPayload(vehicleId, gasolineId);

      res.json({
        message: 'Archivo eliminado correctamente',
        gasolineRecord: updatedRecord
      });
    } catch (error) {
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'El historial de gasolina aÃºn no estÃ¡ disponible en la base de datos. Ejecuta la migraciÃ³n 014.'
        });
      }
      console.error('Error eliminando archivo de gasolina:', error);
      res.status(500).json({
        message: 'Error al eliminar archivo de gasolina',
        error: error.message
      });
    }
  },

  async createSafetyElements(req, res) {
    try {
      const { vehicleId } = req.params;
      const { safetyElements = [], estado } = req.body;
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado'
        });
      }

      const currentElements = vehicle.elementos_seguridad || [];
      const normalizedElements = Array.isArray(safetyElements) ? safetyElements : [];

      for (const element of normalizedElements) {
        const elementId = Number(element.elemento_seguridad_id || element.id);
        if (!elementId) continue;

        const existing = currentElements.find(
          (item) => Number(item.elemento_seguridad_id) === elementId
        );

        const resolvedObservation = typeof element.observaciones === 'string'
          ? element.observaciones.trim()
          : (existing?.observaciones || '');
        const resolvedStatus = element.estatus || existing?.estatus || (resolvedObservation ? 'pendiente' : null);

        if (!resolvedStatus) continue;

        await vehicleModel.createSafetyElement(vehicleId, {
          elemento_seguridad_id: elementId,
          estatus: resolvedStatus,
          observaciones: resolvedObservation
        });
      }

      if (estado && VALID_VEHICLE_STATES.includes(estado)) {
        await vehicleModel.updateVehicleStatus(vehicleId, estado);
      }

      const updatedVehicle = await vehicleModel.getVehicleById(vehicleId);

      res.status(201).json({
        message: 'Elementos de seguridad guardados correctamente',
        vehicleId,
        vehicleStatus: updatedVehicle?.estado || vehicle.estado || 'activo',
        safetyElements: updatedVehicle?.elementos_seguridad || []
      });
    } catch (error) {
      console.error('Error guardando elementos de seguridad:', error);
      res.status(500).json({
        message: 'Error al guardar elementos de seguridad',
        error: error.message
      });
    }
  },

  async updateSafetyElement(req, res) {
    try {
      const { vehicleId, elementId } = req.params;
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado'
        });
      }

      const existing = await vehicleModel.getSafetyElementByVehicleAndElementId(vehicleId, Number(elementId));
      const resolvedObservation = typeof req.body.observaciones === 'string'
        ? req.body.observaciones.trim()
        : (existing?.observaciones || '');
      const resolvedStatus = req.body.estatus || existing?.estatus || (resolvedObservation ? 'pendiente' : null);

      if (!resolvedStatus) {
        return res.status(400).json({
          message: 'El estatus es requerido para guardar el elemento de seguridad'
        });
      }

      const updatedElement = await vehicleModel.createSafetyElement(vehicleId, {
        elemento_seguridad_id: Number(elementId),
        estatus: resolvedStatus,
        observaciones: resolvedObservation
      });

      res.json({
        message: 'Elemento de seguridad actualizado correctamente',
        safetyElement: updatedElement
      });
    } catch (error) {
      console.error('Error actualizando elemento de seguridad:', error);
      res.status(500).json({
        message: 'Error al actualizar elemento de seguridad',
        error: error.message
      });
    }
  },

  async deleteSafetyElement(req, res) {
    try {
      const { vehicleId, elementId } = req.params;
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado'
        });
      }

      const deletedElement = await vehicleModel.deleteSafetyElement(vehicleId, Number(elementId));

      if (!deletedElement) {
        return res.status(404).json({
          message: 'Elemento de seguridad no encontrado'
        });
      }

      res.json({
        message: 'Elemento de seguridad eliminado correctamente'
      });
    } catch (error) {
      console.error('Error eliminando elemento de seguridad:', error);
      res.status(500).json({
        message: 'Error al eliminar elemento de seguridad',
        error: error.message
      });
    }
  },

  async getMaintenanceRecordPayload(vehicleId, maintenanceId) {
    const maintenanceRecord = await vehicleModel.getMaintenanceRecordById(vehicleId, maintenanceId);
    if (!maintenanceRecord) return null;

    const fileRows = await vehicleModel.getMaintenanceFilesMetadata(maintenanceId);

    return {
      ...maintenanceRecord,
      archivos_json: JSON.stringify(fileRows.map((fileRow, index) => ({
        id: fileRow.id,
        nombre_original: fileRow.nombre_original,
        tipo_mime: fileRow.tipo_mime,
        tamano: Number(fileRow.tamano_bytes || 0),
        tamano_bytes: Number(fileRow.tamano_bytes || 0),
        orden: fileRow.orden ?? index + 1,
        download_url: `/api/vehicles/${vehicleId}/maintenance-records/${maintenanceId}/download?fileIndex=${index}`
      })))
    };
  },

  async getGasolineRecordPayload(vehicleId, gasolineId) {
    const gasolineRecord = await vehicleModel.getGasolineRecordById(vehicleId, gasolineId);
    if (!gasolineRecord) return null;

    const fileRows = await vehicleModel.getGasolineFilesMetadata(gasolineId);

    return {
      ...gasolineRecord,
      archivos_json: JSON.stringify(fileRows.map((fileRow, index) => ({
        id: fileRow.id,
        nombre_original: fileRow.nombre_original,
        tipo_mime: fileRow.tipo_mime,
        tamano: Number(fileRow.tamano_bytes || 0),
        tamano_bytes: Number(fileRow.tamano_bytes || 0),
        orden: fileRow.orden ?? index + 1,
        download_url: `/api/vehicles/${vehicleId}/gasoline-records/${gasolineId}/download?fileIndex=${index}`
      })))
    };
  },

  // Listar vehículos
  async listVehicles(req, res) {
    try {
      const vehicles = await vehicleModel.getActiveVehicles();
      res.json({
        message: 'Vehículos listados correctamente',
        count: vehicles.length,
        vehicles
      });
    } catch (error) {
      console.error('Error listando vehículos:', error);
      res.status(500).json({
        message: 'Error al listar vehículos',
        error: error.message
      });
    }
  },

  // Actualizar vehículo
  async updateVehicle(req, res) {
    try {
      const { id } = req.params;

      // Verificar que el vehículo existe
      const existingVehicle = await vehicleModel.getVehicleById(id);
      if (!existingVehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado'
        });
      }

      // Parsear datos que vienen en FormData
      let basicInfo = {};
      let documents = [];
      let safetyElements = [];
      let estado = null;

      // Parsear JSON del FormData o req.body
      if (req.body.basicInfo) {
        basicInfo = typeof req.body.basicInfo === 'string' 
          ? JSON.parse(req.body.basicInfo) 
          : req.body.basicInfo;
      }

      if (req.body.documents) {
        documents = typeof req.body.documents === 'string' 
          ? JSON.parse(req.body.documents) 
          : req.body.documents;
      }

      if (req.body.safetyElements) {
        safetyElements = typeof req.body.safetyElements === 'string' 
          ? JSON.parse(req.body.safetyElements) 
          : req.body.safetyElements;
      }

      // Capturar estado del vehículo
      if (req.body.estado) {
        estado = req.body.estado;
      }

      console.log(`📥 Actualizando vehículo ${id}:`, { basicInfo, documents, safetyElements, estado });

      // ✅ VALIDACIONES - Solo valida basicInfo si se está actualizando
      if (Object.keys(basicInfo).length > 0) {
        const missingFields = [];
        
        if (!basicInfo.propietario_nombre?.trim()) missingFields.push('Nombre del Propietario');
        if (!basicInfo.placa?.trim()) missingFields.push('Placa');
        if (!basicInfo.numero_serie?.trim()) missingFields.push('Número de Serie');
        if (!basicInfo.marca?.trim()) missingFields.push('Marca');
        if (!basicInfo.modelo) missingFields.push('Modelo (Año)');

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: 'Faltan campos requeridos',
            missingFields
          });
        }

        // Validación: Modelo entre 1900 y 2100
        if (basicInfo.modelo < 1900 || basicInfo.modelo > 2100) {
          return res.status(400).json({
            message: 'Modelo debe estar entre 1900 y 2100'
          });
        }

        // 1. Actualizar vehículo
        await vehicleModel.updateVehicle(id, basicInfo);
        console.log('✅ Vehículo actualizado');
      }

      // 2. Actualizar documentos
      if (documents && Array.isArray(documents) && documents.length > 0) {
        // Primero eliminar documentos antiguos
        await vehicleModel.deleteDocumentsByVehicleId(id);
        
        // Después crear los nuevos
        for (const doc of documents) {
          if (doc.tipo_documento_id) {
            try {
              await vehicleModel.createDocument(id, doc);
            } catch (docError) {
              console.error('⚠️ Error guardando documento:', docError.message);
            }
          }
        }
        console.log(`✅ ${documents.filter(d => d.tipo_documento_id).length} documentos actualizados`);
      }

      // 3. Actualizar elementos de seguridad
      if (safetyElements && Array.isArray(safetyElements) && safetyElements.length > 0) {
        // Solo insertar o actualizar los elementos recibidos (sin hacer delete)
        for (const element of safetyElements) {
          if (element.elemento_seguridad_id) {
            try {
              await vehicleModel.createSafetyElement(id, {
                elemento_seguridad_id: element.elemento_seguridad_id,
                estatus: element.estatus,
                observaciones: element.observaciones
              });
            } catch (elemError) {
              console.error('⚠️ Error guardando elemento:', elemError.message);
            }
          }
        }
        console.log(`✅ ${safetyElements.filter(e => e.elemento_seguridad_id).length} elementos de seguridad actualizados`);
      }

      // 3.5 Actualizar estado del vehículo si se proporciona
      if (estado && VALID_VEHICLE_STATES.includes(estado)) {
        try {
          await vehicleModel.updateVehicleStatus(id, estado);
          console.log(`✅ Estado del vehículo actualizado a: ${estado}`);
        } catch (statusError) {
          console.error('⚠️ Error actualizando estado:', statusError.message);
        }
      }

      // 4. Procesar fotos eliminadas (si las hay)
      let deletedPhotos = [];
      if (req.body.deletedPhotos) {
        deletedPhotos = typeof req.body.deletedPhotos === 'string' 
          ? JSON.parse(req.body.deletedPhotos) 
          : req.body.deletedPhotos;
      }

      let deletedPhotosCount = 0;
      if (deletedPhotos && Array.isArray(deletedPhotos) && deletedPhotos.length > 0) {
        for (const photoType of deletedPhotos) {
          try {
            // Eliminar foto de foto de la BD (soft delete)
            await vehicleModel.deletePhotoByType(id, photoType);
            deletedPhotosCount++;
            console.log(`✅ Foto eliminada: ${photoType}`);
          } catch (deleteError) {
            console.error(`⚠️ Error eliminando foto ${photoType}:`, deleteError.message);
            // Continuar con las siguientes fotos
          }
        }
      }

      // 5. Procesar nuevas fotos (si las hay)
      let uploadedPhotos = 0;

      for (const photoType of VEHICLE_PHOTO_TYPES) {
        if (req.files && req.files[photoType]) {
          const file = req.files[photoType][0];
          
          try {
            // Subir a Cloudinary
            const cloudinaryUrl = await cloudinaryService.uploadImage(
              file.buffer,
              `vehicle_${id}_${photoType}_${Date.now()}`
            );

            // Eliminar foto antigua si existe
            await vehicleModel.deletePhotoByType(id, photoType);

            // Guardar nueva foto en BD
            await vehicleModel.createPhoto(id, {
              tipo_foto: photoType,
              archivo_url: cloudinaryUrl,
              descripcion: req.body[`descripcion_${photoType}`] || '',
              categoria: 'general'
            });

            uploadedPhotos++;
            console.log(`✅ Foto actualizada: ${photoType} → Cloudinary`);
          } catch (photoError) {
            console.error(`⚠️ Error subiendo foto ${photoType}:`, photoError.message);
            // Continuar con siguientes fotos
          }
        }
      }

      for (const photoType of VEHICLE_PHOTO_TYPES) {
        if (Object.prototype.hasOwnProperty.call(req.body, `descripcion_${photoType}`)) {
          try {
            await vehicleModel.updatePhotoDescriptionByType(
              id,
              photoType,
              req.body[`descripcion_${photoType}`] || ''
            );
          } catch (descriptionError) {
            console.error(`Error actualizando descripcion de foto ${photoType}:`, descriptionError.message);
          }
        }
      }

      // 6. Retornar vehículo actualizado
      const updatedVehicle = await vehicleModel.getVehicleById(id);

      // Normalizar respuesta a camelCase para frontend
      res.json({
        ...updatedVehicle,
        documents: updatedVehicle.documentos || [],
        maintenanceRecords: updatedVehicle.mantenimientos || [],
        gasolineRecords: updatedVehicle.gasolina_registros || [],
        safetyElements: updatedVehicle.elementos_seguridad || [],
        photos: updatedVehicle.fotografias || []
      });

    } catch (error) {
      console.error('❌ Error actualizando vehículo:', error);
      res.status(500).json({
        message: 'Error al actualizar vehículo',
        error: error.message
      });
    }
  },

  // ===== MÉTODOS PARA DOCUMENTOS INDIVIDUALES =====

  // GET - Obtener documento individual
  async getDocumentById(req, res) {
    try {
      const { vehicleId, docId } = req.params;

      const document = await vehicleModel.getDocumentById(vehicleId, docId);

      if (!document) {
        return res.status(404).json({
          message: 'Documento no encontrado'
        });
      }

      res.json(document);
    } catch (error) {
      console.error('❌ Error obteniendo documento:', error);
      res.status(500).json({
        message: 'Error al obtener documento',
        error: error.message
      });
    }
  },

  // POST - Crear nuevo documento con múltiples archivos
  async createDocument(req, res) {
    try {
      const { vehicleId } = req.params;
      
      console.error('🚀🚀🚀 [DOC_CREATE] INICIO - createDocument llamado');
      console.error('   vehicleId:', vehicleId);
      console.error('   req.files?.length:', req.files?.length);
      console.error('   req.body:', { 
        tipo_documento_id: req.body.tipo_documento_id,
        ambito: req.body.ambito,
        estado: req.body.estado,
        dependencia_otorga: req.body.dependencia_otorga,
        vigencia: req.body.vigencia,
        folio_oficio: req.body.folio_oficio,
        observaciones: req.body.observaciones,
        estatus: req.body.estatus
      });
      
      const {
        tipo_documento_id,
        ambito,
        estado,
        dependencia_otorga,
        vigencia,
        folio_oficio,
        observaciones,
        estatus
      } = req.body;

      // Validar que el vehículo existe
      const vehicle = await vehicleModel.getVehicleById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehículo no encontrado'
        });
      }

      // Subir archivos a Cloudinary directamente desde buffer
      let archivosGuardados = [];
      if (req.files && req.files.length > 0) {
        console.error(`📎 [DOC_CREATE] vehicleId=${vehicleId} archivos_recibidos=${req.files.length}`);
        try {
          archivosGuardados = req.files.map((file, index) => ({
            nombre_original: file.originalname,
            tamaño: file.size,
            tipo_mime: file.mimetype,
            orden: index + 1
          }));
          console.error(`✅ [DOC_CREATE] archivos_preparados=${archivosGuardados.length}`);
        } catch (uploadError) {
          console.error('❌ [DOC_CREATE] Error procesando archivos:', uploadError.message);
          return res.status(500).json({
            message: 'Error al procesar archivos del documento',
            error: uploadError.message
          });
        }
      } else {
        console.error('⚠️ [DOC_CREATE] NO HAY ARCHIVOS - req.files:', req.files);
      }

      // Crear documento en BD
      const documentData = {
        tipo_documento_id: parseInt(tipo_documento_id),
        ambito: ambito || 'federal',
        estado: estado || 'válido',
        dependencia_otorga,
        vigencia,
        folio_oficio,
        observaciones: observaciones || '',
        estatus: estatus || 'vigente',
        archivo_url: null,
        archivos_json: null
      };

      console.error(`💾 [DOC_CREATE] guardando_en_BD archivo_url=${documentData.archivo_url || 'null'} numArchivos=${archivosGuardados.length}`);

      const document = await vehicleModel.createDocument(vehicleId, documentData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addDocumentFiles(document.id, req.files);
      }

      const createdDocument = await vehicleModel.getDocumentById(vehicleId, document.id);

      console.error(`✅✅✅ [DOC_CREATE] documento_id=${document.id} archivos=${req.files?.length || 0}`);

      res.status(201).json({
        message: 'Documento creado exitosamente',
        document: createdDocument,
        archivosGuardados: archivosGuardados.length
      });
    } catch (error) {
      console.error('❌ [DOC_CREATE] Error FATAL:', error.message, error.stack);
      res.status(500).json({
        message: 'Error al crear documento',
        error: error.message
      });
    }
  },

  // PUT - Actualizar documento individual con archivos
  async updateDocument(req, res) {
    try {
      const { vehicleId, docId } = req.params;
      
      console.error('🔄🔄🔄 [DOC_UPDATE] INICIO - updateDocument llamado');
      console.error('   vehicleId:', vehicleId);
      console.error('   docId:', docId);
      console.error('   req.files?.length:', req.files?.length);
      
      const {
        tipo_documento_id,
        ambito,
        estado,
        dependencia_otorga,
        vigencia,
        folio_oficio,
        observaciones,
        estatus
      } = req.body;

      // Verificar que el documento existe
      const existingDoc = await vehicleModel.getDocumentById(vehicleId, docId);
      if (!existingDoc) {
        return res.status(404).json({
          message: 'Documento no encontrado'
        });
      }

      // Mantener archivos existentes y agregar nuevos si se proporcionan
      let archivosGuardados = [];

      if (req.files && req.files.length > 0) {
        console.error(`📎 [DOC_UPDATE] vehicleId=${vehicleId} docId=${docId} archivos_nuevos=${req.files.length}`);
        try {
          archivosGuardados = req.files.map((file, index) => ({
            nombre_original: file.originalname,
            tamaño: file.size,
            tipo_mime: file.mimetype,
            orden: index + 1
          }));

          await vehicleModel.addDocumentFiles(docId, req.files);
          console.error(`✅ [DOC_UPDATE] archivos_agregados=${archivosGuardados.length}`);
        } catch (uploadError) {
          console.error('❌ [DOC_UPDATE] Error procesando archivos:', uploadError.message);
          return res.status(500).json({
            message: 'Error al procesar archivos del documento',
            error: uploadError.message
          });
        }
      } else {
        console.error('ℹ️ [DOC_UPDATE] Sin archivos nuevos, manteniendo existentes');
      }

      // Actualizar documento
      const documentData = {
        tipo_documento_id: parseInt(tipo_documento_id),
        ambito: ambito || 'federal',
        estado: estado || 'válido',
        dependencia_otorga,
        vigencia,
        folio_oficio,
        observaciones: observaciones || '',
        estatus: estatus || 'vigente',
        archivo_url: existingDoc.archivo_url,
        archivos_json: existingDoc.archivos_json
      };

      console.error(`💾 [DOC_UPDATE] guardando_en_BD archivo_url=${existingDoc.archivo_url || 'null'}`);

      const updatedDoc = await vehicleModel.updateDocument(vehicleId, docId, documentData);

      const enrichedUpdatedDoc = await vehicleModel.getDocumentById(vehicleId, docId);

      console.error(`✅✅✅ [DOC_UPDATE] docId=${docId} archivos_nuevos=${archivosGuardados.length}`);

      res.json({
        message: 'Documento actualizado exitosamente',
        document: enrichedUpdatedDoc,
        archivosGuardados: req.files?.length || 0
      });
    } catch (error) {
      console.error('❌ [DOC_UPDATE] Error FATAL:', error.message, error.stack);
      res.status(500).json({
        message: 'Error al actualizar documento',
        error: error.message
      });
    }
  },

  // DELETE - Eliminar documento
  async deleteDocument(req, res) {
    try {
      const { vehicleId, docId } = req.params;

      // Verificar que el documento existe
      const existingDoc = await vehicleModel.getDocumentById(vehicleId, docId);
      if (!existingDoc) {
        return res.status(404).json({
          message: 'Documento no encontrado'
        });
      }

      // Eliminar documento (soft delete)
      await vehicleModel.deleteDocument(vehicleId, docId);

      res.json({
        message: 'Documento eliminado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error eliminando documento:', error);
      res.status(500).json({
        message: 'Error al eliminar documento',
        error: error.message
      });
    }
  },

  // GET - Descargar archivo del documento
  async downloadDocument(req, res) {
    try {
      const { vehicleId, docId } = req.params;
      const parsedIndex = Number.parseInt(req.query.fileIndex ?? '0', 10);
      const fileIndex = Number.isNaN(parsedIndex) || parsedIndex < 0 ? 0 : parsedIndex;
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;

      console.log(`\n🔵 [DOC_DOWNLOAD] START vehicleId=${vehicleId} docId=${docId} fileIndex=${fileIndex}`);

      const selectedFile = await vehicleModel.getDocumentFileByIndex(vehicleId, docId, fileIndex);
      if (!selectedFile) {
        console.error('❌ [DOC_DOWNLOAD] Documento o archivo no encontrado');
        return res.status(404).json({
          message: 'Documento o archivo no encontrado'
        });
      }

      if (selectedFile?.archivo_data) {
        const fileName = selectedFile.nombre_original || `${selectedFile.tipo_nombre || 'documento'}.bin`;
        const fileSize = Buffer.isBuffer(selectedFile.archivo_data) 
          ? selectedFile.archivo_data.length 
          : selectedFile.tamaño_bytes || 0;

        console.log(`📥 [DOC_DOWNLOAD] Sending file from DB:`);
        console.log(`   - fileName: ${fileName}`);
        console.log(`   - mimeType: ${selectedFile.tipo_mime || 'application/octet-stream'}`);
        console.log(`   - fileSize: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`   - dataType: ${typeof selectedFile.archivo_data}`);
        console.log(`   - isBuffer: ${Buffer.isBuffer(selectedFile.archivo_data)}`);

        res.setHeader('Content-Type', selectedFile.tipo_mime || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', fileSize);

        console.log('✅ [DOC_DOWNLOAD] Headers set, sending file...');
        return res.send(selectedFile.archivo_data);
      }

      const legacyPath = selectedFile.legacy_archivo_url;
      console.warn('⚠️ [DOC_DOWNLOAD] Archivo binario no encontrado, intentando fallback legacy');

      // Verificar que el archivo existe
      if (!legacyPath || !fs.existsSync(legacyPath)) {
        if (isRemoteUrl(legacyPath)) {
          return res.redirect(legacyPath);
        }

        console.warn(`⚠️ [DOC_DOWNLOAD] archivo_no_encontrado localPath=${legacyPath || 'null'}`);
        return res.status(404).json({
          message: 'El archivo no existe en el servidor'
        });
      }

      // Enviar archivo para descargar
      const fileName = selectedFile?.nombre_original || path.basename(legacyPath);
      console.log(`📥 [DOC_DOWNLOAD] Sending file from disk: ${fileName}`);
      res.download(legacyPath, fileName, (err) => {
        if (err) {
          console.error('❌ Error descargando archivo:', err);
        } else {
          console.log(`✅ Archivo descargado: ${fileName}`);
        }
      });
    } catch (error) {
      console.error('❌ [DOC_DOWNLOAD] Error FATAL:', error);
      res.status(500).json({
        message: 'Error al descargar documento',
        error: error.message
      });
    }
  },

  // DELETE archivo individual
  async deleteDocumentFile(req, res) {
    try {
      const { vehicleId, docId, fileId } = req.params;

      // Verificar que el documento existe
      const document = await vehicleModel.getDocumentById(vehicleId, docId);
      if (!document) {
        return res.status(404).json({
          message: 'Documento no encontrado'
        });
      }

      // Marcar archivo como eliminado (soft delete)
      const result = await vehicleModel.deleteDocumentFile(docId, fileId);
      
      if (!result) {
        return res.status(404).json({
          message: 'Archivo no encontrado'
        });
      }

      console.log(`✅ [DELETE_FILE] Archivo ${fileId} eliminado del documento ${docId}`);

      // Retornar documento actualizado
      const updatedDocument = await vehicleModel.getDocumentById(vehicleId, docId);

      res.json({
        message: 'Archivo eliminado exitosamente',
        document: updatedDocument
      });
    } catch (error) {
      console.error('❌ [DELETE_FILE] Error:', error.message);
      res.status(500).json({
        message: 'Error al eliminar archivo',
        error: error.message
      });
    }
  }
};
