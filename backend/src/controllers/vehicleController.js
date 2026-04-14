import { vehicleModel } from '../models/vehicleModel.js';
import { cloudinaryService } from '../services/cloudinaryService.js';

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
      const photoTypes = [
        'frente', 'parte_trasera', 'lado_piloto', 'lado_copiloto', 
        'senales_y_luces', 'estrobos', 'extintor', 'rotulacion', 
        'torreta', 'proteccion_antiderrames', 'equipo_comunicacion', 
        'arnes_y_conectores', 'equipo_proteccion_personal'
      ];

      let uploadedPhotos = 0;

      for (const photoType of photoTypes) {
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

      console.log(`📥 Actualizando vehículo ${id}:`, { basicInfo, documents, safetyElements });

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
        // Primero eliminar elementos antiguos
        await vehicleModel.deleteSafetyElementsByVehicleId(id);
        
        // Después crear los nuevos
        for (const element of safetyElements) {
          if (element.id) {
            try {
              await vehicleModel.createSafetyElement(id, {
                elemento_seguridad_id: element.id,
                estatus: element.estatus,
                observaciones: element.observaciones
              });
            } catch (elemError) {
              console.error('⚠️ Error guardando elemento:', elemError.message);
            }
          }
        }
        console.log(`✅ ${safetyElements.filter(e => e.id).length} elementos de seguridad actualizados`);
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
      const photoTypes = [
        'frente', 'parte_trasera', 'lado_piloto', 'lado_copiloto', 
        'senales_y_luces', 'estrobos', 'extintor', 'rotulacion', 
        'torreta', 'proteccion_antiderrames', 'equipo_comunicacion', 
        'arnes_y_conectores', 'equipo_proteccion_personal'
      ];

      let uploadedPhotos = 0;

      for (const photoType of photoTypes) {
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

      // 6. Retornar vehículo actualizado
      const updatedVehicle = await vehicleModel.getVehicleById(id);

      // Normalizar respuesta a camelCase para frontend
      res.json({
        ...updatedVehicle,
        documents: updatedVehicle.documentos || [],
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
  }
};
