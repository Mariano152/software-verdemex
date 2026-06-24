import { vehicleModel } from '../models/vehicleModel.js';
import { vehicleHistoryModel } from '../models/vehicleHistoryModel.js';
import { inventoryModel } from '../models/inventoryModel.js';
import { cloudinaryService } from '../services/cloudinaryService.js';
import { VALID_FUEL_TYPES, normalizeFuelType } from '../constants/fuelTypes.js';

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
const VALID_VEHICLE_TYPES = ['Torton', 'Tracto', 'Remolque', 'Rabon', 'Pipa', 'Gondola', 'Plataforma'];
const VEHICLE_PHOTO_TYPES = [
  'frente', 'parte_trasera', 'lado_piloto', 'lado_copiloto',
  'senales_y_luces', 'estrobos', 'extintor', 'rotulacion',
  'torreta', 'proteccion_antiderrames', 'equipo_comunicacion',
  'arnes_y_conectores', 'equipo_proteccion_personal'
];
const PHOTO_TYPE_LABELS = {
  frente: 'Frente',
  parte_trasera: 'Parte trasera',
  lado_piloto: 'Lado piloto',
  lado_copiloto: 'Lado copiloto',
  senales_y_luces: 'Senales y luces',
  estrobos: 'Estrobos',
  extintor: 'Extintor',
  rotulacion: 'Rotulacion',
  torreta: 'Torreta',
  proteccion_antiderrames: 'Proteccion antiderrames',
  equipo_comunicacion: 'Equipo de comunicacion',
  arnes_y_conectores: 'Arnes y conectores',
  equipo_proteccion_personal: 'Equipo de proteccion personal'
};

const getPhotoTypeLabel = (photoType) => PHOTO_TYPE_LABELS[photoType] || photoType;

const getDocumentTypeLabel = (document) => (
  document?.tipo_nombre ||
  document?.tipo_documento_id ||
  'documento'
);

const normalizeText = (value) => String(value || '').trim();
const normalizeNullableText = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};
const normalizeDocumentVigencia = (value, estatus = '') => {
  const normalizedStatus = normalizeText(estatus).toLowerCase();
  if (normalizedStatus === 'no_aplica') {
    return null;
  }

  const normalizedValue = normalizeText(value);
  return normalizedValue || null;
};
const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'si', 'sí', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
};
const normalizeTimeValue = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};
const normalizeInteger = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};
const normalizeDateValue = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};
const normalizeLoadSource = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === 'pipa' ? 'pipa' : 'gasolinera';
};
const buildGasolineRecordTitle = ({ factura, fecha_carga, placa }) => {
  if (factura) return `Factura ${factura}`;
  if (fecha_carga && placa) return `Carga ${placa} ${fecha_carga}`;
  if (placa) return `Carga ${placa}`;
  return 'Carga de gasolina';
};
const buildGlobalGasolineData = (body, vehicle, previousMileage = null, options = {}) => {
  const { preserveCapturedPreviousMileage = false } = options;
  const primeraCarga = normalizeBoolean(body.primera_carga);
  const kilometrajeAnteriorCapturado = normalizeNumber(body.kilometraje_anterior);
  const kilometrajeAnterior = primeraCarga
    ? (kilometrajeAnteriorCapturado ?? 0)
    : preserveCapturedPreviousMileage
      ? (kilometrajeAnteriorCapturado ?? previousMileage ?? 0)
      : (previousMileage ?? 0);
  const kilometrajeActual = normalizeNumber(body.kilometraje_actual);
  const kilometrosRecorridos = kilometrajeActual !== null && kilometrajeAnterior !== null
    ? kilometrajeActual - kilometrajeAnterior
    : null;
  const tituloCapturado = normalizeText(body.titulo);

  return {
    vehiculo_id: body.vehiculo_id?.trim(),
    titulo: tituloCapturado || buildGasolineRecordTitle({
      factura: normalizeText(body.factura),
      fecha_carga: body.fecha_carga,
      placa: vehicle?.placa
    }),
    tipo_combustible: normalizeFuelType(body.tipo_combustible),
    fecha_carga: body.fecha_carga,
    factura: normalizeNullableText(body.factura),
    hora_carga: normalizeTimeValue(body.hora_carga),
    costo_total: Number(body.costo_total || 0),
    litros: Number(body.litros || 0),
    proveedor: normalizeText(body.proveedor),
    descripcion: normalizeText(body.descripcion),
    observaciones: normalizeText(body.observaciones),
    kilometraje_actual: kilometrajeActual,
    kilometraje_anterior: kilometrajeAnterior,
    kilometros_recorridos: kilometrosRecorridos,
    m3_enviados: normalizeNumber(body.m3_enviados),
    operador: normalizeNullableText(body.operador),
    primera_carga: primeraCarga,
    origen_carga: normalizeLoadSource(body.origen_carga),
    inventario_pipa_registro_id: normalizeNullableText(body.inventario_pipa_registro_id),
    pipa_nombre_snapshot: normalizeNullableText(body.pipa_nombre_snapshot),
    precio_litro_referencia: normalizeNumber(body.precio_litro_referencia),
    placa_snapshot: normalizeNullableText(vehicle?.placa),
    descripcion_snapshot: normalizeNullableText(vehicle?.descripcion || vehicle?.propietario_nombre),
    numero_economico_snapshot: normalizeNullableText(vehicle?.numero_economico || body.numero_economico_snapshot)
  };
};
const validateGlobalGasolineData = (gasolineData, operationParameters = null) => {
  if (!gasolineData.vehiculo_id || !gasolineData.fecha_carga || !gasolineData.titulo) {
    return 'Vehiculo, nombre y fecha de carga son requeridos';
  }

  if (!gasolineData.factura) {
    return 'La factura es requerida';
  }

  if (!gasolineData.tipo_combustible) {
    return `Selecciona un tipo de combustible valido: ${VALID_FUEL_TYPES.join(', ')}`;
  }

  if (!gasolineData.hora_carga) {
    return 'La hora es requerida';
  }

  if (!gasolineData.proveedor) {
    return 'El proveedor es requerido';
  }

  if (!gasolineData.placa_snapshot) {
    return 'La placa del vehiculo es requerida';
  }

  if (!gasolineData.numero_economico_snapshot) {
    return 'El numero economico del vehiculo es requerido';
  }

  if (!gasolineData.operador) {
    return 'El operador es requerido';
  }

  if (gasolineData.origen_carga === 'pipa' && !gasolineData.inventario_pipa_registro_id) {
    return 'Selecciona una pipa con recarga valida para usar este origen';
  }

  if (gasolineData.costo_total < 0 || gasolineData.litros <= 0) {
    return 'El monto debe ser mayor o igual a 0 y los litros deben ser mayores a 0';
  }

  if (operationParameters?.capacidad_tanque_litros !== null && operationParameters?.capacidad_tanque_litros !== undefined) {
    const tankCapacity = Number(operationParameters.capacidad_tanque_litros || 0);
    if (tankCapacity > 0 && gasolineData.litros > tankCapacity) {
      return `Los litros no pueden superar la capacidad del tanque (${tankCapacity.toLocaleString('es-MX')} L)`;
    }
  }

  if (gasolineData.kilometraje_actual === null) {
    return 'El kilometraje actual es requerido';
  }

  if (gasolineData.kilometraje_actual <= gasolineData.kilometraje_anterior) {
    return 'El kilometraje actual debe ser mayor al kilometraje anterior';
  }

  if (gasolineData.kilometros_recorridos !== null && gasolineData.kilometros_recorridos < 0) {
    return 'Los kilometros recorridos no pueden ser negativos';
  }

  if (gasolineData.m3_enviados !== null && gasolineData.m3_enviados < 0) {
    return 'Los m3 enviados no pueden ser negativos';
  }

  if (gasolineData.m3_enviados === null) {
    return 'Los m3 enviados son requeridos';
  }

  return null;
};

const isGasolineValidationError = (error) => (
  error?.statusCode === 400
  || String(error?.message || '').startsWith('Selecciona la pipa')
  || String(error?.message || '').startsWith('La pipa seleccionada')
);

const syncPipaFifoConsumption = async (gasolineId, body, gasolineData) => {
  if (gasolineData.origen_carga !== 'pipa') {
    await inventoryModel.clearPipaFifoConsumption(gasolineId);
    return;
  }

  const pipaId = normalizeNullableText(body.pipa_id);
  await inventoryModel.replacePipaFifoConsumption({
    gasolineId,
    pipaId,
    fecha: gasolineData.fecha_carga,
    allocations: gasolineData.fifo_allocations || []
  });
};

const applyPipaPricingIfNeeded = async (body, gasolineData, options = {}) => {
  if (gasolineData.origen_carga !== 'pipa') {
    return gasolineData;
  }

  const pipaId = normalizeNullableText(body.pipa_id);
  if (!pipaId) {
    const error = new Error('Selecciona la pipa origen para la carga');
    error.statusCode = 400;
    throw error;
  }

  const pipa = await inventoryModel.getPipaById(pipaId);
  if (!pipa) {
    const error = new Error('La pipa seleccionada no existe');
    error.statusCode = 400;
    throw error;
  }

  const fifoPricing = await inventoryModel.calculatePipaFifoCost({
    pipaId,
    litros: gasolineData.litros,
    fecha: gasolineData.fecha_carga,
    excludeGasolineId: options.excludeGasolineId || null
  });

  return {
    ...gasolineData,
    tipo_combustible: normalizeFuelType(pipa.tipo_combustible),
    costo_total: fifoPricing.costo_total,
    proveedor: gasolineData.proveedor || fifoPricing.proveedor || pipa.nombre,
    inventario_pipa_registro_id: fifoPricing.inventario_pipa_registro_id,
    pipa_nombre_snapshot: pipa.nombre,
    precio_litro_referencia: fifoPricing.precio_litro_referencia,
    fifo_allocations: fifoPricing.allocations
  };
};
const buildVehicleParametersData = (body = {}) => ({
  capacidad_tanque_litros: normalizeNumber(body.capacidad_tanque_litros),
  rendimiento_objetivo_km_l: normalizeNumber(body.rendimiento_objetivo_km_l),
  porcentaje_precaucion_menor: normalizeNumber(body.porcentaje_precaucion_menor),
  porcentaje_precaucion_mayor: normalizeNumber(body.porcentaje_precaucion_mayor),
  tiempo_cambio_aceite_meses: normalizeInteger(body.tiempo_cambio_aceite_meses),
  aviso_previo_tiempo_aceite_meses: normalizeInteger(body.aviso_previo_tiempo_aceite_meses),
  distancia_cambio_aceite_km: normalizeNumber(body.distancia_cambio_aceite_km),
  aviso_previo_cambio_aceite_km: normalizeNumber(body.aviso_previo_cambio_aceite_km)
});
const validateVehicleParametersData = (parametersData) => {
  const requiredFields = [
    'capacidad_tanque_litros',
    'rendimiento_objetivo_km_l',
    'porcentaje_precaucion_menor',
    'porcentaje_precaucion_mayor',
    'tiempo_cambio_aceite_meses',
    'aviso_previo_tiempo_aceite_meses',
    'distancia_cambio_aceite_km',
    'aviso_previo_cambio_aceite_km'
  ];

  const missingField = requiredFields.find((field) => parametersData[field] === null);
  if (missingField) {
    return 'Todos los parametros operativos son requeridos';
  }

  if (parametersData.capacidad_tanque_litros <= 0) {
    return 'La capacidad del tanque debe ser mayor a 0';
  }

  if (parametersData.rendimiento_objetivo_km_l <= 0) {
    return 'El rendimiento objetivo debe ser mayor a 0';
  }

  if (parametersData.porcentaje_precaucion_menor < 0 || parametersData.porcentaje_precaucion_menor > 100) {
    return 'El porcentaje de precaucion menor debe estar entre 0 y 100';
  }

  if (parametersData.porcentaje_precaucion_mayor < 0 || parametersData.porcentaje_precaucion_mayor > 100) {
    return 'El porcentaje de precaucion mayor debe estar entre 0 y 100';
  }

  if (parametersData.porcentaje_precaucion_mayor < parametersData.porcentaje_precaucion_menor) {
    return 'El porcentaje de precaucion mayor no puede ser menor al porcentaje de precaucion menor';
  }

  if (parametersData.tiempo_cambio_aceite_meses <= 0) {
    return 'El tiempo para cambio de aceite debe ser mayor a 0';
  }

  if (parametersData.aviso_previo_tiempo_aceite_meses < 0) {
    return 'El aviso previo por tiempo no puede ser negativo';
  }

  if (parametersData.aviso_previo_tiempo_aceite_meses > parametersData.tiempo_cambio_aceite_meses) {
    return 'El aviso previo por tiempo no puede ser mayor al tiempo de cambio de aceite';
  }

  if (parametersData.distancia_cambio_aceite_km <= 0) {
    return 'La distancia para cambio de aceite debe ser mayor a 0';
  }

  if (parametersData.aviso_previo_cambio_aceite_km < 0) {
    return 'El aviso previo por kilometraje no puede ser negativo';
  }

  if (parametersData.aviso_previo_cambio_aceite_km > parametersData.distancia_cambio_aceite_km) {
    return 'El aviso previo por kilometraje no puede ser mayor a la distancia de cambio de aceite';
  }

  return null;
};
const valuesAreDifferent = (previous, next) => {
  if (previous === null && next === null) return false;
  return previous !== next;
};
const buildChanges = (fieldMap, previousData, nextData) => (
  Object.entries(fieldMap).reduce((changes, [field, label]) => {
    const previous = previousData[field] ?? null;
    const next = nextData[field] ?? null;

    if (!valuesAreDifferent(previous, next)) {
      return changes;
    }

    changes.push({
      field,
      label,
      before: previous,
      after: next
    });
    return changes;
  }, [])
);
const buildMaintenanceData = async (req, vehicleId, existingRecord = null) => {
  const esCambioAceite = normalizeBoolean(req.body.es_cambio_aceite);
  const usarKilometrajeManual = normalizeBoolean(req.body.usar_kilometraje_base_manual);
  const kilometrajeManual = normalizeNumber(req.body.kilometraje_base_aceite_manual);
  const fechaServicio = normalizeDateValue(req.body.fecha_servicio);

  const maintenanceData = {
    titulo: req.body.titulo?.trim(),
    tipo_mantenimiento: req.body.tipo_mantenimiento?.trim(),
    fecha_servicio: fechaServicio,
    costo: Number(req.body.costo || 0),
    proveedor: req.body.proveedor?.trim() || '',
    descripcion: req.body.descripcion?.trim() || '',
    observaciones: req.body.observaciones?.trim() || '',
    es_cambio_aceite: esCambioAceite,
    kilometraje_base_aceite: null,
    kilometraje_base_fuente: null
  };

  if (!esCambioAceite) {
    return maintenanceData;
  }

  if (usarKilometrajeManual) {
    if (kilometrajeManual === null || kilometrajeManual < 0) {
      const error = new Error('Captura un kilometraje base valido para el cambio de aceite.');
      error.statusCode = 400;
      throw error;
    }

    maintenanceData.kilometraje_base_aceite = kilometrajeManual;
    maintenanceData.kilometraje_base_fuente = 'manual';
    return maintenanceData;
  }

  const previousMileage = await vehicleModel.getLatestGasolineMileageByVehicleId(vehicleId, {
    fecha_carga: fechaServicio,
    excludeGasolineId: null
  });

  if (previousMileage === null || previousMileage === undefined) {
    const error = new Error('No existe una carga de gasolina anterior o igual a la fecha del cambio. Captura el kilometraje base manualmente.');
    error.statusCode = 400;
    throw error;
  }

  maintenanceData.kilometraje_base_aceite = Number(previousMileage);
  maintenanceData.kilometraje_base_fuente = 'gasolina';

  if (existingRecord?.es_cambio_aceite && existingRecord.kilometraje_base_fuente === 'manual' && kilometrajeManual !== null) {
    maintenanceData.kilometraje_base_aceite = kilometrajeManual;
    maintenanceData.kilometraje_base_fuente = 'manual';
  }

  return maintenanceData;
};

const buildGlobalMaintenanceData = async (req, vehicleId, existingRecord = null) => {
  const maintenanceData = await buildMaintenanceData(req, vehicleId, existingRecord);

  return {
    vehiculo_id: normalizeNullableText(vehicleId),
    ...maintenanceData
  };
};

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
        numero_economico: req.body.numero_economico,
        tipo_carro: req.body.tipo_carro,
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
      
      if (!basicInfo.numero_economico?.trim()) missingFields.push('Numero Economico');
      if (!basicInfo.tipo_carro?.trim()) missingFields.push('Tipo de Carro');
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

      if (!VALID_VEHICLE_TYPES.includes(basicInfo.tipo_carro)) {
        return res.status(400).json({
          message: `Tipo de carro invalido. Opciones: ${VALID_VEHICLE_TYPES.join(', ')}`
        });
      }

      // Verificar duplicados
      const duplicateResult = await vehicleModel.checkDuplicates(
        basicInfo.placa,
        basicInfo.numero_serie,
        basicInfo.numero_economico
      );
      const duplicates = Array.isArray(duplicateResult)
        ? duplicateResult
        : duplicateResult
          ? [duplicateResult]
          : [];
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
      const uploadedPhotoTypes = [];
      const updatedDescriptionTypes = [];

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
            uploadedPhotoTypes.push(photoType);
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
          operationParameters: completeVehicle.parametros_operativos || null,
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
        operationParameters: vehicle.parametros_operativos || null,
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

  async getVehicleParameters(req, res) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      res.json({
        vehicleId,
        parameters: vehicle.parametros_operativos || null
      });
    } catch (error) {
      console.error('Error obteniendo parametros del vehiculo:', error);
      res.status(500).json({
        message: 'Error al obtener parametros del vehiculo',
        error: error.message
      });
    }
  },

  async upsertVehicleParameters(req, res) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      const previousParameters = vehicle.parametros_operativos || null;
      const parametersData = buildVehicleParametersData(req.body);
      const validationError = validateVehicleParametersData(parametersData);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const savedParameters = await vehicleModel.upsertVehicleParameters(vehicleId, parametersData);

      const changes = buildChanges(
        {
          capacidad_tanque_litros: 'Capacidad de tanque',
          rendimiento_objetivo_km_l: 'Rendimiento objetivo',
          porcentaje_precaucion_menor: 'Porcentaje de precaucion menor',
          porcentaje_precaucion_mayor: 'Porcentaje de precaucion mayor',
          tiempo_cambio_aceite_meses: 'Tiempo de cambio de aceite',
          aviso_previo_tiempo_aceite_meses: 'Aviso previo por tiempo',
          distancia_cambio_aceite_km: 'Distancia de cambio de aceite',
          aviso_previo_cambio_aceite_km: 'Aviso previo por kilometraje'
        },
        {
          capacidad_tanque_litros: normalizeNumber(previousParameters?.capacidad_tanque_litros),
          rendimiento_objetivo_km_l: normalizeNumber(previousParameters?.rendimiento_objetivo_km_l),
          porcentaje_precaucion_menor: normalizeNumber(previousParameters?.porcentaje_precaucion_menor),
          porcentaje_precaucion_mayor: normalizeNumber(previousParameters?.porcentaje_precaucion_mayor),
          tiempo_cambio_aceite_meses: normalizeInteger(previousParameters?.tiempo_cambio_aceite_meses),
          aviso_previo_tiempo_aceite_meses: normalizeInteger(previousParameters?.aviso_previo_tiempo_aceite_meses),
          distancia_cambio_aceite_km: normalizeNumber(previousParameters?.distancia_cambio_aceite_km),
          aviso_previo_cambio_aceite_km: normalizeNumber(previousParameters?.aviso_previo_cambio_aceite_km)
        },
        parametersData
      );

      await vehicleController.logHistory(req, vehicleId, {
        module: 'parametros',
        action: previousParameters ? 'actualizar' : 'crear',
        entityType: 'vehicle_parameters',
        entityId: savedParameters?.id || vehicleId,
        description: previousParameters
          ? 'Actualizo los parametros operativos del vehiculo'
          : 'Configuro los parametros operativos del vehiculo',
        details: {
          changes
        }
      });

      res.json({
        message: previousParameters
          ? 'Parametros operativos actualizados correctamente'
          : 'Parametros operativos configurados correctamente',
        parameters: savedParameters
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      if (error.code === '42P01') {
        return res.status(503).json({
          message: 'Los parametros operativos aun no estan disponibles en la base de datos. Ejecuta la migracion 019.'
        });
      }

      console.error('Error guardando parametros del vehiculo:', error);
      res.status(500).json({
        message: 'Error al guardar parametros del vehiculo',
        error: error.message
      });
    }
  },

  async getVehicleHistory(req, res) {
    try {
      const { vehicleId } = req.params;
      const parsedLimit = Number.parseInt(req.query.limit ?? '', 10);
      const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? null : parsedLimit;

      const vehicle = await vehicleModel.getVehicleById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      const history = await vehicleHistoryModel.getHistoryByVehicleId(vehicleId, { limit });

      res.json({
        vehicleId,
        total: history.length,
        history
      });
    } catch (error) {
      console.error('Error obteniendo historial del vehiculo:', error);
      res.status(500).json({
        message: 'Error al obtener historial del vehiculo',
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

      const maintenanceData = await buildMaintenanceData(req, vehicleId);

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

      await vehicleController.logHistory(req, vehicleId, {
        module: 'mantenimiento',
        action: 'crear',
        entityType: 'maintenance_record',
        entityId: maintenanceRecord.id,
        description: `Agrego mantenimiento "${maintenanceData.titulo}" del tipo "${maintenanceData.tipo_mantenimiento}"`,
        details: {
          fecha_servicio: maintenanceData.fecha_servicio,
          costo: maintenanceData.costo,
          proveedor: maintenanceData.proveedor || null,
          es_cambio_aceite: maintenanceData.es_cambio_aceite,
          kilometraje_base_aceite: maintenanceData.kilometraje_base_aceite,
          kilometraje_base_fuente: maintenanceData.kilometraje_base_fuente,
          archivos_adjuntos: req.files?.length || 0
        }
      });

      if (req.files && req.files.length > 0) {
        await vehicleController.logHistory(req, vehicleId, {
          module: 'mantenimiento',
          action: 'agregar_archivo',
          entityType: 'maintenance_file',
          entityId: maintenanceRecord.id,
          description: `Agrego ${req.files.length} documento(s) al mantenimiento "${maintenanceData.titulo}"`,
          details: {
            archivos_agregados: req.files.map((file) => file.originalname)
          }
        });
      }

      res.status(201).json({
        message: 'Registro de mantenimiento creado correctamente',
        maintenanceRecord: createdRecord
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
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

      const maintenanceData = await buildMaintenanceData(req, vehicleId, existingRecord);

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
      const changes = buildChanges(
        {
          titulo: 'Titulo',
          tipo_mantenimiento: 'Tipo de mantenimiento',
          fecha_servicio: 'Fecha de servicio',
          costo: 'Costo',
          proveedor: 'Proveedor',
          descripcion: 'Descripcion',
          observaciones: 'Observaciones',
          es_cambio_aceite: 'Cambio de aceite',
          kilometraje_base_aceite: 'Kilometraje base aceite',
          kilometraje_base_fuente: 'Fuente kilometraje base'
        },
        {
          titulo: normalizeNullableText(existingRecord.titulo),
          tipo_mantenimiento: normalizeNullableText(existingRecord.tipo_mantenimiento),
          fecha_servicio: normalizeNullableText(existingRecord.fecha_servicio),
          costo: normalizeNumber(existingRecord.costo),
          proveedor: normalizeNullableText(existingRecord.proveedor),
          descripcion: normalizeNullableText(existingRecord.descripcion),
          observaciones: normalizeNullableText(existingRecord.observaciones),
          es_cambio_aceite: Boolean(existingRecord.es_cambio_aceite),
          kilometraje_base_aceite: normalizeNumber(existingRecord.kilometraje_base_aceite),
          kilometraje_base_fuente: normalizeNullableText(existingRecord.kilometraje_base_fuente)
        },
        {
          titulo: normalizeNullableText(maintenanceData.titulo),
          tipo_mantenimiento: normalizeNullableText(maintenanceData.tipo_mantenimiento),
          fecha_servicio: normalizeNullableText(maintenanceData.fecha_servicio),
          costo: normalizeNumber(maintenanceData.costo),
          proveedor: normalizeNullableText(maintenanceData.proveedor),
          descripcion: normalizeNullableText(maintenanceData.descripcion),
          observaciones: normalizeNullableText(maintenanceData.observaciones),
          es_cambio_aceite: Boolean(maintenanceData.es_cambio_aceite),
          kilometraje_base_aceite: normalizeNumber(maintenanceData.kilometraje_base_aceite),
          kilometraje_base_fuente: normalizeNullableText(maintenanceData.kilometraje_base_fuente)
        }
      );

      await vehicleController.logHistory(req, vehicleId, {
        module: 'mantenimiento',
        action: 'actualizar',
        entityType: 'maintenance_record',
        entityId: maintenanceId,
        description: `Actualizo mantenimiento "${maintenanceData.titulo}"`,
        details: {
          changes,
          archivos_nuevos: req.files?.length || 0
        }
      });

      if (req.files && req.files.length > 0) {
        await vehicleController.logHistory(req, vehicleId, {
          module: 'mantenimiento',
          action: 'agregar_archivo',
          entityType: 'maintenance_file',
          entityId: maintenanceId,
          description: `Agrego ${req.files.length} documento(s) al mantenimiento "${maintenanceData.titulo}"`,
          details: {
            maintenance_id: maintenanceId,
            archivos_agregados: req.files.map((file) => file.originalname)
          }
        });
      }

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

      await vehicleController.logHistory(req, vehicleId, {
        module: 'mantenimiento',
        action: 'eliminar',
        entityType: 'maintenance_record',
        entityId: maintenanceId,
        description: `Elimino el mantenimiento "${deletedRecord.titulo || maintenanceId}"`,
        details: {
          fecha_servicio: deletedRecord.fecha_servicio || null
        }
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

      await vehicleController.logHistory(req, vehicleId, {
        module: 'mantenimiento',
        action: 'eliminar_archivo',
        entityType: 'maintenance_file',
        entityId: fileId,
        description: `Elimino un archivo adjunto del mantenimiento "${maintenanceRecord.titulo || maintenanceId}"`,
        details: {
          maintenance_id: maintenanceId,
          archivo_id: fileId
        }
      });

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

      const latestMileage = await vehicleModel.getLatestGasolineMileageByVehicleId(vehicleId, {
        fecha_carga: req.body.fecha_carga,
        hora_carga: req.body.hora_carga
      });
      let gasolineData = buildGlobalGasolineData(
        { ...req.body, vehiculo_id: vehicleId },
        vehicle,
        latestMileage
      );
      gasolineData = await applyPipaPricingIfNeeded(req.body, gasolineData);
      const validationError = validateGlobalGasolineData(gasolineData, vehicle.parametros_operativos);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }


      const gasolineRecord = await vehicleModel.createGasolineRecord(vehicleId, gasolineData);
      await syncPipaFifoConsumption(gasolineRecord.id, req.body, gasolineData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addGasolineFiles(gasolineRecord.id, req.files);
      }

      const createdRecord = await vehicleController.getGasolineRecordPayload(vehicleId, gasolineRecord.id);

      await vehicleController.logHistory(req, vehicleId, {
        module: 'gasolina',
        action: 'crear',
        entityType: 'gasoline_record',
        entityId: gasolineRecord.id,
        description: `Agrego carga de gasolina "${gasolineData.titulo}"`,
        details: {
          factura: gasolineData.factura,
          fecha_carga: gasolineData.fecha_carga,
          hora_carga: gasolineData.hora_carga,
          tipo_combustible: gasolineData.tipo_combustible,
          costo_total: gasolineData.costo_total,
          litros: gasolineData.litros,
          proveedor: gasolineData.proveedor || null,
          kilometraje_actual: gasolineData.kilometraje_actual,
          kilometraje_anterior: gasolineData.kilometraje_anterior,
          kilometros_recorridos: gasolineData.kilometros_recorridos,
          m3_enviados: gasolineData.m3_enviados,
          operador: gasolineData.operador || null,
          archivos_adjuntos: req.files?.length || 0
        }
      });

      if (req.files && req.files.length > 0) {
        await vehicleController.logHistory(req, vehicleId, {
          module: 'gasolina',
          action: 'agregar_archivo',
          entityType: 'gasoline_file',
          entityId: gasolineRecord.id,
          description: `Agrego ${req.files.length} documento(s) a la carga de gasolina "${gasolineData.titulo}"`,
          details: {
            archivos_agregados: req.files.map((file) => file.originalname)
          }
        });
      }

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
      if (isGasolineValidationError(error)) {
        return res.status(400).json({ message: error.message });
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
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!existingRecord || !vehicle) {
        return res.status(404).json({
          message: !existingRecord ? 'Registro de gasolina no encontrado' : 'Vehiculo no encontrado'
        });
      }

      const latestMileage = await vehicleModel.getLatestGasolineMileageByVehicleId(vehicleId, {
        fecha_carga: req.body.fecha_carga,
        hora_carga: req.body.hora_carga,
        excludeGasolineId: gasolineId
      });
      let gasolineData = buildGlobalGasolineData(
        { ...req.body, vehiculo_id: vehicleId },
        vehicle,
        latestMileage
      );
      gasolineData = await applyPipaPricingIfNeeded(req.body, gasolineData, {
        excludeGasolineId: gasolineId
      });
      const validationError = validateGlobalGasolineData(gasolineData, vehicle.parametros_operativos);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      await vehicleModel.updateGasolineRecord(vehicleId, gasolineId, gasolineData);
      await syncPipaFifoConsumption(gasolineId, req.body, gasolineData);


      const updatedRecord = await vehicleController.getGasolineRecordPayload(vehicleId, gasolineId);
      const changes = buildChanges(
        {
          titulo: 'Titulo',
          tipo_combustible: 'Tipo de combustible',
          fecha_carga: 'Fecha',
          factura: 'Factura',
          hora_carga: 'Hora',
          costo_total: 'Costo total',
          litros: 'Litros',
          proveedor: 'Proveedor',
          kilometraje_actual: 'Kilometraje actual',
          kilometraje_anterior: 'Kilometraje anterior',
          kilometros_recorridos: 'Km recorridos',
          m3_enviados: 'M3 enviados',
          operador: 'Operador',
          primera_carga: 'Primera carga',
          descripcion: 'Descripcion',
          observaciones: 'Observaciones'
        },
        {
          titulo: normalizeNullableText(existingRecord.titulo),
          tipo_combustible: normalizeNullableText(existingRecord.tipo_combustible),
          fecha_carga: normalizeNullableText(existingRecord.fecha_carga),
          factura: normalizeNullableText(existingRecord.factura),
          hora_carga: normalizeNullableText(existingRecord.hora_carga),
          costo_total: normalizeNumber(existingRecord.costo_total),
          litros: normalizeNumber(existingRecord.litros),
          proveedor: normalizeNullableText(existingRecord.proveedor),
          kilometraje_actual: normalizeNumber(existingRecord.kilometraje_actual),
          kilometraje_anterior: normalizeNumber(existingRecord.kilometraje_anterior),
          kilometros_recorridos: normalizeNumber(existingRecord.kilometros_recorridos),
          m3_enviados: normalizeNumber(existingRecord.m3_enviados),
          operador: normalizeNullableText(existingRecord.operador),
          primera_carga: Boolean(existingRecord.primera_carga),
          descripcion: normalizeNullableText(existingRecord.descripcion),
          observaciones: normalizeNullableText(existingRecord.observaciones)
        },
        {
          titulo: normalizeNullableText(gasolineData.titulo),
          tipo_combustible: normalizeNullableText(gasolineData.tipo_combustible),
          fecha_carga: normalizeNullableText(gasolineData.fecha_carga),
          factura: normalizeNullableText(gasolineData.factura),
          hora_carga: normalizeNullableText(gasolineData.hora_carga),
          costo_total: normalizeNumber(gasolineData.costo_total),
          litros: normalizeNumber(gasolineData.litros),
          proveedor: normalizeNullableText(gasolineData.proveedor),
          kilometraje_actual: normalizeNumber(gasolineData.kilometraje_actual),
          kilometraje_anterior: normalizeNumber(gasolineData.kilometraje_anterior),
          kilometros_recorridos: normalizeNumber(gasolineData.kilometros_recorridos),
          m3_enviados: normalizeNumber(gasolineData.m3_enviados),
          operador: normalizeNullableText(gasolineData.operador),
          primera_carga: Boolean(gasolineData.primera_carga),
          descripcion: normalizeNullableText(gasolineData.descripcion),
          observaciones: normalizeNullableText(gasolineData.observaciones)
        }
      );

      await vehicleController.logHistory(req, vehicleId, {
        module: 'gasolina',
        action: 'actualizar',
        entityType: 'gasoline_record',
        entityId: gasolineId,
        description: `Actualizo la carga de gasolina "${gasolineData.titulo}"`,
        details: {
          changes,
          archivos_nuevos: req.files?.length || 0
        }
      });

      if (req.files && req.files.length > 0) {
        await vehicleController.logHistory(req, vehicleId, {
          module: 'gasolina',
          action: 'agregar_archivo',
          entityType: 'gasoline_file',
          entityId: gasolineId,
          description: `Agrego ${req.files.length} documento(s) a la carga de gasolina "${gasolineData.titulo}"`,
          details: {
            gasoline_id: gasolineId,
            archivos_agregados: req.files.map((file) => file.originalname)
          }
        });
      }

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
      if (isGasolineValidationError(error)) {
        return res.status(400).json({ message: error.message });
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
      await inventoryModel.clearPipaFifoConsumption(gasolineId);

      res.json({
        message: 'Registro de gasolina eliminado correctamente'
      });

      await vehicleController.logHistory(req, vehicleId, {
        module: 'gasolina',
        action: 'eliminar',
        entityType: 'gasoline_record',
        entityId: gasolineId,
        description: `Elimino la carga de gasolina "${deletedRecord.titulo || gasolineId}"`,
        details: {
          fecha_carga: deletedRecord.fecha_carga || null
        }
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

      await vehicleController.logHistory(req, vehicleId, {
        module: 'gasolina',
        action: 'eliminar_archivo',
        entityType: 'gasoline_file',
        entityId: fileId,
        description: `Elimino un archivo adjunto de la carga de gasolina "${gasolineRecord.titulo || gasolineId}"`,
        details: {
          gasoline_id: gasolineId,
          archivo_id: fileId
        }
      });

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

  async listGlobalGasolineRecords(req, res) {
    try {
      const records = await vehicleModel.getAllGasolineRecords({
        vehicleId: req.query.vehicleId || null,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null
      });

      const enrichedRecords = await Promise.all(
        records.map((record) => vehicleModel.getGlobalGasolineRecordPayload(record.id))
      );

      res.json({
        message: 'Registros globales de gasolina listados correctamente',
        count: enrichedRecords.filter(Boolean).length,
        gasolineRecords: enrichedRecords.filter(Boolean)
      });
    } catch (error) {
      console.error('Error listando registros globales de gasolina:', error);
      res.status(500).json({
        message: 'Error al listar registros globales de gasolina',
        error: error.message
      });
    }
  },

  async getGlobalGasolineRecordById(req, res) {
    try {
      const { gasolineId } = req.params;
      const gasolineRecord = await vehicleModel.getGlobalGasolineRecordPayload(gasolineId);

      if (!gasolineRecord) {
        return res.status(404).json({
          message: 'Registro global de gasolina no encontrado'
        });
      }

      res.json(gasolineRecord);
    } catch (error) {
      console.error('Error obteniendo registro global de gasolina:', error);
      res.status(500).json({
        message: 'Error al obtener registro global de gasolina',
        error: error.message
      });
    }
  },

  async createGlobalGasolineRecord(req, res) {
    try {
      const vehicleId = req.body.vehiculo_id?.trim();
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      const latestMileage = await vehicleModel.getLatestGasolineMileageByVehicleId(vehicleId, {
        fecha_carga: req.body.fecha_carga,
        hora_carga: req.body.hora_carga
      });
      let gasolineData = buildGlobalGasolineData(req.body, vehicle, latestMileage);
      gasolineData = await applyPipaPricingIfNeeded(req.body, gasolineData);
      const validationError = validateGlobalGasolineData(gasolineData, vehicle.parametros_operativos);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const gasolineRecord = await vehicleModel.createGasolineRecord(vehicleId, gasolineData);
      await syncPipaFifoConsumption(gasolineRecord.id, req.body, gasolineData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addGasolineFiles(gasolineRecord.id, req.files);
      }

      const createdRecord = await vehicleModel.getGlobalGasolineRecordPayload(gasolineRecord.id);

      await vehicleController.logHistory(req, vehicleId, {
        module: 'gasolina',
        action: 'crear',
        entityType: 'gasoline_record',
        entityId: gasolineRecord.id,
        description: `Agrego carga global de gasolina para ${vehicle.placa}`,
        details: {
          titulo: gasolineData.titulo,
          tipo_combustible: gasolineData.tipo_combustible,
          fecha_carga: gasolineData.fecha_carga,
          hora_carga: gasolineData.hora_carga,
          factura: gasolineData.factura,
          costo_total: gasolineData.costo_total,
          litros: gasolineData.litros,
          kilometraje_actual: gasolineData.kilometraje_actual,
          kilometraje_anterior: gasolineData.kilometraje_anterior,
          m3_enviados: gasolineData.m3_enviados,
          archivos_adjuntos: req.files?.length || 0
        }
      });

      res.status(201).json({
        message: 'Registro global de gasolina creado correctamente',
        gasolineRecord: createdRecord
      });
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de gasolina requiere la migracion 017.'
        });
      }
      if (isGasolineValidationError(error)) {
        return res.status(400).json({ message: error.message });
      }
      console.error('Error creando registro global de gasolina:', error);
      res.status(500).json({
        message: 'Error al crear registro global de gasolina',
        error: error.message
      });
    }
  },

  async updateGlobalGasolineRecord(req, res) {
    try {
      const { gasolineId } = req.params;
      const existingRecord = await vehicleModel.getGlobalGasolineRecordById(gasolineId);

      if (!existingRecord) {
        return res.status(404).json({
          message: 'Registro global de gasolina no encontrado'
        });
      }

      const vehicleId = req.body.vehiculo_id?.trim();
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      const latestMileage = await vehicleModel.getLatestGasolineMileageByVehicleId(vehicleId, {
        fecha_carga: req.body.fecha_carga,
        hora_carga: req.body.hora_carga,
        excludeGasolineId: gasolineId
      });
      let gasolineData = buildGlobalGasolineData(req.body, vehicle, latestMileage);
      gasolineData = await applyPipaPricingIfNeeded(req.body, gasolineData, {
        excludeGasolineId: gasolineId
      });
      const validationError = validateGlobalGasolineData(gasolineData, vehicle.parametros_operativos);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      await vehicleModel.updateGlobalGasolineRecord(gasolineId, gasolineData);
      await syncPipaFifoConsumption(gasolineId, req.body, gasolineData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addGasolineFiles(gasolineId, req.files);
      }

      const updatedRecord = await vehicleModel.getGlobalGasolineRecordPayload(gasolineId);
      const changes = buildChanges(
        {
          vehiculo_id: 'Vehiculo',
          titulo: 'Nombre',
          tipo_combustible: 'Tipo de combustible',
          fecha_carga: 'Fecha',
          hora_carga: 'Hora',
          factura: 'Factura',
          costo_total: 'Monto',
          litros: 'Litros',
          proveedor: 'Proveedor',
          kilometraje_actual: 'Kilometraje actual',
          kilometraje_anterior: 'Kilometraje anterior',
          kilometros_recorridos: 'Km recorridos',
          m3_enviados: 'M3 enviados',
          operador: 'Operador',
          primera_carga: 'Primera carga'
        },
        {
          vehiculo_id: normalizeNullableText(existingRecord.vehiculo_id),
          titulo: normalizeNullableText(existingRecord.titulo),
          tipo_combustible: normalizeNullableText(existingRecord.tipo_combustible),
          fecha_carga: normalizeNullableText(existingRecord.fecha_carga),
          hora_carga: normalizeNullableText(existingRecord.hora_carga),
          factura: normalizeNullableText(existingRecord.factura),
          costo_total: normalizeNumber(existingRecord.costo_total),
          litros: normalizeNumber(existingRecord.litros),
          proveedor: normalizeNullableText(existingRecord.proveedor),
          kilometraje_actual: normalizeNumber(existingRecord.kilometraje_actual),
          kilometraje_anterior: normalizeNumber(existingRecord.kilometraje_anterior),
          kilometros_recorridos: normalizeNumber(existingRecord.kilometros_recorridos),
          m3_enviados: normalizeNumber(existingRecord.m3_enviados),
          operador: normalizeNullableText(existingRecord.operador),
          primera_carga: Boolean(existingRecord.primera_carga)
        },
        {
          vehiculo_id: normalizeNullableText(gasolineData.vehiculo_id),
          titulo: normalizeNullableText(gasolineData.titulo),
          tipo_combustible: normalizeNullableText(gasolineData.tipo_combustible),
          fecha_carga: normalizeNullableText(gasolineData.fecha_carga),
          hora_carga: normalizeNullableText(gasolineData.hora_carga),
          factura: normalizeNullableText(gasolineData.factura),
          costo_total: normalizeNumber(gasolineData.costo_total),
          litros: normalizeNumber(gasolineData.litros),
          proveedor: normalizeNullableText(gasolineData.proveedor),
          kilometraje_actual: normalizeNumber(gasolineData.kilometraje_actual),
          kilometraje_anterior: normalizeNumber(gasolineData.kilometraje_anterior),
          kilometros_recorridos: normalizeNumber(gasolineData.kilometros_recorridos),
          m3_enviados: normalizeNumber(gasolineData.m3_enviados),
          operador: normalizeNullableText(gasolineData.operador),
          primera_carga: Boolean(gasolineData.primera_carga)
        }
      );

      await vehicleController.logHistory(req, vehicleId, {
        module: 'gasolina',
        action: 'actualizar',
        entityType: 'gasoline_record',
        entityId: gasolineId,
        description: `Actualizo carga global de gasolina para ${vehicle.placa}`,
        details: {
          changes,
          archivos_nuevos: req.files?.length || 0
        }
      });

      res.json({
        message: 'Registro global de gasolina actualizado correctamente',
        gasolineRecord: updatedRecord
      });
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de gasolina requiere la migracion 017.'
        });
      }
      if (isGasolineValidationError(error)) {
        return res.status(400).json({ message: error.message });
      }
      console.error('Error actualizando registro global de gasolina:', error);
      res.status(500).json({
        message: 'Error al actualizar registro global de gasolina',
        error: error.message
      });
    }
  },

  async deleteGlobalGasolineRecord(req, res) {
    try {
      const { gasolineId } = req.params;
      const deletedRecord = await vehicleModel.deleteGlobalGasolineRecord(gasolineId);

      if (!deletedRecord) {
        return res.status(404).json({
          message: 'Registro global de gasolina no encontrado'
        });
      }
      await inventoryModel.clearPipaFifoConsumption(gasolineId);

      res.json({
        message: 'Registro global de gasolina eliminado correctamente'
      });

      await vehicleController.logHistory(req, deletedRecord.vehiculo_id, {
        module: 'gasolina',
        action: 'eliminar',
        entityType: 'gasoline_record',
        entityId: gasolineId,
        description: `Elimino carga global de gasolina ${deletedRecord.factura || deletedRecord.titulo || gasolineId}`,
        details: {
          fecha_carga: deletedRecord.fecha_carga || null
        }
      });
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de gasolina requiere la migracion 017.'
        });
      }
      console.error('Error eliminando registro global de gasolina:', error);
      res.status(500).json({
        message: 'Error al eliminar registro global de gasolina',
        error: error.message
      });
    }
  },

  async downloadGlobalGasolineFile(req, res) {
    try {
      const { gasolineId } = req.params;
      const parsedIndex = Number.parseInt(req.query.fileIndex ?? '0', 10);
      const fileIndex = Number.isNaN(parsedIndex) || parsedIndex < 0 ? 0 : parsedIndex;

      const selectedFile = await vehicleModel.getGlobalGasolineFileByIndex(gasolineId, fileIndex);
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
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de gasolina requiere la migracion 017.'
        });
      }
      console.error('Error descargando archivo global de gasolina:', error);
      res.status(500).json({
        message: 'Error al descargar archivo global de gasolina',
        error: error.message
      });
    }
  },

  async deleteGlobalGasolineFile(req, res) {
    try {
      const { gasolineId, fileId } = req.params;
      const gasolineRecord = await vehicleModel.getGlobalGasolineRecordById(gasolineId);

      if (!gasolineRecord) {
        return res.status(404).json({
          message: 'Registro global de gasolina no encontrado'
        });
      }

      const deletedFile = await vehicleModel.deleteGasolineFile(gasolineId, fileId);

      if (!deletedFile) {
        return res.status(404).json({
          message: 'Archivo no encontrado'
        });
      }

      const updatedRecord = await vehicleModel.getGlobalGasolineRecordPayload(gasolineId);

      await vehicleController.logHistory(req, gasolineRecord.vehiculo_id, {
        module: 'gasolina',
        action: 'eliminar_archivo',
        entityType: 'gasoline_file',
        entityId: fileId,
        description: `Elimino un archivo adjunto de la carga global ${gasolineRecord.factura || gasolineRecord.titulo || gasolineId}`,
        details: {
          gasoline_id: gasolineId,
          archivo_id: fileId
        }
      });

      res.json({
        message: 'Archivo eliminado correctamente',
        gasolineRecord: updatedRecord
      });
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de gasolina requiere la migracion 017.'
        });
      }
      console.error('Error eliminando archivo global de gasolina:', error);
      res.status(500).json({
        message: 'Error al eliminar archivo global de gasolina',
        error: error.message
      });
    }
  },

  async listGlobalMaintenanceRecords(req, res) {
    try {
      const records = await vehicleModel.getAllMaintenanceRecords({
        vehicleId: req.query.vehicleId || null,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null
      });

      const enrichedRecords = await Promise.all(
        records.map((record) => vehicleModel.getGlobalMaintenanceRecordPayload(record.id))
      );

      res.json({
        message: 'Registros globales de mantenimiento listados correctamente',
        count: enrichedRecords.filter(Boolean).length,
        maintenanceRecords: enrichedRecords.filter(Boolean)
      });
    } catch (error) {
      console.error('Error listando registros globales de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al listar registros globales de mantenimiento',
        error: error.message
      });
    }
  },

  async getGlobalMaintenanceRecordById(req, res) {
    try {
      const { maintenanceId } = req.params;
      const maintenanceRecord = await vehicleModel.getGlobalMaintenanceRecordPayload(maintenanceId);

      if (!maintenanceRecord) {
        return res.status(404).json({
          message: 'Registro global de mantenimiento no encontrado'
        });
      }

      res.json(maintenanceRecord);
    } catch (error) {
      console.error('Error obteniendo registro global de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al obtener registro global de mantenimiento',
        error: error.message
      });
    }
  },

  async createGlobalMaintenanceRecord(req, res) {
    try {
      const vehicleId = req.body.vehiculo_id?.trim();
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      const maintenanceData = await buildGlobalMaintenanceData(req, vehicleId);

      if (!maintenanceData.titulo || !maintenanceData.tipo_mantenimiento || !maintenanceData.fecha_servicio) {
        return res.status(400).json({
          message: 'Titulo, tipo de mantenimiento y fecha de servicio son requeridos'
        });
      }

      const maintenanceRecord = await vehicleModel.createMaintenanceRecord(vehicleId, maintenanceData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addMaintenanceFiles(maintenanceRecord.id, req.files);
      }

      const createdRecord = await vehicleModel.getGlobalMaintenanceRecordPayload(maintenanceRecord.id);

      await vehicleController.logHistory(req, vehicleId, {
        module: 'mantenimiento',
        action: 'crear',
        entityType: 'maintenance_record',
        entityId: maintenanceRecord.id,
        description: `Agrego mantenimiento global "${maintenanceData.titulo}" para ${vehicle.placa}`,
        details: {
          titulo: maintenanceData.titulo,
          tipo_mantenimiento: maintenanceData.tipo_mantenimiento,
          fecha_servicio: maintenanceData.fecha_servicio,
          costo: maintenanceData.costo,
          proveedor: maintenanceData.proveedor || null,
          es_cambio_aceite: maintenanceData.es_cambio_aceite,
          kilometraje_base_aceite: maintenanceData.kilometraje_base_aceite,
          kilometraje_base_fuente: maintenanceData.kilometraje_base_fuente,
          archivos_adjuntos: req.files?.length || 0
        }
      });

      res.status(201).json({
        message: 'Registro global de mantenimiento creado correctamente',
        maintenanceRecord: createdRecord
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de mantenimiento requiere las migraciones 013 y 021.'
        });
      }
      console.error('Error creando registro global de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al crear registro global de mantenimiento',
        error: error.message
      });
    }
  },

  async updateGlobalMaintenanceRecord(req, res) {
    try {
      const { maintenanceId } = req.params;
      const existingRecord = await vehicleModel.getGlobalMaintenanceRecordById(maintenanceId);

      if (!existingRecord) {
        return res.status(404).json({
          message: 'Registro global de mantenimiento no encontrado'
        });
      }

      const vehicleId = req.body.vehiculo_id?.trim();
      const vehicle = await vehicleModel.getVehicleById(vehicleId);

      if (!vehicle) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      const maintenanceData = await buildGlobalMaintenanceData(req, vehicleId, existingRecord);

      if (!maintenanceData.titulo || !maintenanceData.tipo_mantenimiento || !maintenanceData.fecha_servicio) {
        return res.status(400).json({
          message: 'Titulo, tipo de mantenimiento y fecha de servicio son requeridos'
        });
      }

      await vehicleModel.updateGlobalMaintenanceRecord(maintenanceId, maintenanceData);

      if (req.files && req.files.length > 0) {
        await vehicleModel.addMaintenanceFiles(maintenanceId, req.files);
      }

      const updatedRecord = await vehicleModel.getGlobalMaintenanceRecordPayload(maintenanceId);
      const changes = buildChanges(
        {
          vehiculo_id: 'Vehiculo',
          titulo: 'Titulo',
          tipo_mantenimiento: 'Tipo de mantenimiento',
          fecha_servicio: 'Fecha de servicio',
          costo: 'Costo',
          proveedor: 'Proveedor',
          descripcion: 'Descripcion',
          observaciones: 'Observaciones',
          es_cambio_aceite: 'Cambio de aceite',
          kilometraje_base_aceite: 'Kilometraje base aceite',
          kilometraje_base_fuente: 'Fuente kilometraje base'
        },
        {
          vehiculo_id: normalizeNullableText(existingRecord.vehiculo_id),
          titulo: normalizeNullableText(existingRecord.titulo),
          tipo_mantenimiento: normalizeNullableText(existingRecord.tipo_mantenimiento),
          fecha_servicio: normalizeNullableText(existingRecord.fecha_servicio),
          costo: normalizeNumber(existingRecord.costo),
          proveedor: normalizeNullableText(existingRecord.proveedor),
          descripcion: normalizeNullableText(existingRecord.descripcion),
          observaciones: normalizeNullableText(existingRecord.observaciones),
          es_cambio_aceite: Boolean(existingRecord.es_cambio_aceite),
          kilometraje_base_aceite: normalizeNumber(existingRecord.kilometraje_base_aceite),
          kilometraje_base_fuente: normalizeNullableText(existingRecord.kilometraje_base_fuente)
        },
        {
          vehiculo_id: normalizeNullableText(maintenanceData.vehiculo_id),
          titulo: normalizeNullableText(maintenanceData.titulo),
          tipo_mantenimiento: normalizeNullableText(maintenanceData.tipo_mantenimiento),
          fecha_servicio: normalizeNullableText(maintenanceData.fecha_servicio),
          costo: normalizeNumber(maintenanceData.costo),
          proveedor: normalizeNullableText(maintenanceData.proveedor),
          descripcion: normalizeNullableText(maintenanceData.descripcion),
          observaciones: normalizeNullableText(maintenanceData.observaciones),
          es_cambio_aceite: Boolean(maintenanceData.es_cambio_aceite),
          kilometraje_base_aceite: normalizeNumber(maintenanceData.kilometraje_base_aceite),
          kilometraje_base_fuente: normalizeNullableText(maintenanceData.kilometraje_base_fuente)
        }
      );

      await vehicleController.logHistory(req, vehicleId, {
        module: 'mantenimiento',
        action: 'actualizar',
        entityType: 'maintenance_record',
        entityId: maintenanceId,
        description: `Actualizo mantenimiento global "${maintenanceData.titulo}" para ${vehicle.placa}`,
        details: {
          changes,
          archivos_nuevos: req.files?.length || 0
        }
      });

      res.json({
        message: 'Registro global de mantenimiento actualizado correctamente',
        maintenanceRecord: updatedRecord
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de mantenimiento requiere las migraciones 013 y 021.'
        });
      }
      console.error('Error actualizando registro global de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al actualizar registro global de mantenimiento',
        error: error.message
      });
    }
  },

  async deleteGlobalMaintenanceRecord(req, res) {
    try {
      const { maintenanceId } = req.params;
      const existingRecord = await vehicleModel.getGlobalMaintenanceRecordById(maintenanceId);

      if (!existingRecord) {
        return res.status(404).json({
          message: 'Registro global de mantenimiento no encontrado'
        });
      }

      const deletedRecord = await vehicleModel.deleteMaintenanceRecord(existingRecord.vehiculo_id, maintenanceId);

      if (!deletedRecord) {
        return res.status(404).json({
          message: 'Registro global de mantenimiento no encontrado'
        });
      }

      res.json({
        message: 'Registro global de mantenimiento eliminado correctamente'
      });

      await vehicleController.logHistory(req, existingRecord.vehiculo_id, {
        module: 'mantenimiento',
        action: 'eliminar',
        entityType: 'maintenance_record',
        entityId: maintenanceId,
        description: `Elimino mantenimiento global "${deletedRecord.titulo || maintenanceId}"`,
        details: {
          fecha_servicio: deletedRecord.fecha_servicio || null
        }
      });
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de mantenimiento requiere las migraciones 013 y 021.'
        });
      }
      console.error('Error eliminando registro global de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al eliminar registro global de mantenimiento',
        error: error.message
      });
    }
  },

  async downloadGlobalMaintenanceFile(req, res) {
    try {
      const { maintenanceId } = req.params;
      const parsedIndex = Number.parseInt(req.query.fileIndex ?? '0', 10);
      const fileIndex = Number.isNaN(parsedIndex) || parsedIndex < 0 ? 0 : parsedIndex;

      const selectedFile = await vehicleModel.getGlobalMaintenanceFileByIndex(maintenanceId, fileIndex);
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
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de mantenimiento requiere las migraciones 013 y 021.'
        });
      }
      console.error('Error descargando archivo global de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al descargar archivo global de mantenimiento',
        error: error.message
      });
    }
  },

  async deleteGlobalMaintenanceFile(req, res) {
    try {
      const { maintenanceId, fileId } = req.params;
      const maintenanceRecord = await vehicleModel.getGlobalMaintenanceRecordById(maintenanceId);

      if (!maintenanceRecord) {
        return res.status(404).json({
          message: 'Registro global de mantenimiento no encontrado'
        });
      }

      const deletedFile = await vehicleModel.deleteMaintenanceFile(maintenanceId, fileId);

      if (!deletedFile) {
        return res.status(404).json({
          message: 'Archivo no encontrado'
        });
      }

      const updatedRecord = await vehicleModel.getGlobalMaintenanceRecordPayload(maintenanceId);

      await vehicleController.logHistory(req, maintenanceRecord.vehiculo_id, {
        module: 'mantenimiento',
        action: 'eliminar_archivo',
        entityType: 'maintenance_file',
        entityId: fileId,
        description: `Elimino un archivo adjunto del mantenimiento global "${maintenanceRecord.titulo || maintenanceId}"`,
        details: {
          maintenance_id: maintenanceId,
          archivo_id: fileId
        }
      });

      res.json({
        message: 'Archivo eliminado correctamente',
        maintenanceRecord: updatedRecord
      });
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        return res.status(503).json({
          message: 'El historial global de mantenimiento requiere las migraciones 013 y 021.'
        });
      }
      console.error('Error eliminando archivo global de mantenimiento:', error);
      res.status(500).json({
        message: 'Error al eliminar archivo global de mantenimiento',
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

      const changedElements = normalizedElements.filter((element) => {
        const elementId = Number(element.elemento_seguridad_id || element.id);
        if (!elementId) return false;

        const previous = currentElements.find(
          (item) => Number(item.elemento_seguridad_id) === elementId
        );

        const previousStatus = normalizeText(previous?.estatus);
        const previousObservation = normalizeText(previous?.observaciones);
        const nextStatus = normalizeText(element.estatus);
        const nextObservation = normalizeText(element.observaciones);

        return previousStatus !== nextStatus || previousObservation !== nextObservation;
      });

      const stateChanged = estado && vehicle.estado !== updatedVehicle?.estado;

      if (changedElements.length > 0 || stateChanged) {
        const detailParts = [];
        if (changedElements.length > 0) {
          detailParts.push(`actualizo ${changedElements.length} elemento(s) de seguridad`);
        }
        if (stateChanged) {
          detailParts.push(`cambio el estado del vehiculo de "${vehicle.estado}" a "${updatedVehicle?.estado}"`);
        }

        await vehicleController.logHistory(req, vehicleId, {
          module: 'mantenimiento',
          action: 'actualizar',
          entityType: 'safety_and_status',
          entityId: vehicleId,
          description: `Actualizo mantenimiento: ${detailParts.join(' y ')}`,
          details: {
            elementos_actualizados: changedElements.map((item) => ({
              elemento_seguridad_id: item.elemento_seguridad_id || item.id,
              elemento_nombre: (() => {
                const previous = currentElements.find(
                  (element) => Number(element.elemento_seguridad_id) === Number(item.elemento_seguridad_id || item.id)
                );
                return previous?.elemento_nombre || `Elemento ${item.elemento_seguridad_id || item.id}`;
              })(),
              changes: buildChanges(
                {
                  estatus: 'Estatus',
                  observaciones: 'Observaciones'
                },
                (() => {
                  const previous = currentElements.find(
                    (element) => Number(element.elemento_seguridad_id) === Number(item.elemento_seguridad_id || item.id)
                  );
                  return {
                    estatus: normalizeNullableText(previous?.estatus),
                    observaciones: normalizeNullableText(previous?.observaciones)
                  };
                })(),
                {
                  estatus: normalizeNullableText(item.estatus),
                  observaciones: normalizeNullableText(item.observaciones)
                }
              )
            })),
            estado_changes: stateChanged
              ? [{
                  field: 'estado',
                  label: 'Estado del vehiculo',
                  before: vehicle.estado || null,
                  after: updatedVehicle?.estado || null
                }]
              : []
          }
        });
      }

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
  async logHistory(req, vehicleId, payload) {
    try {
      if (!vehicleId || !payload?.module || !payload?.action || !payload?.description) return;

      await vehicleHistoryModel.createEntry({
        vehicleId,
        userId: req.user?.id || null,
        module: payload.module,
        action: payload.action,
        entityType: payload.entityType || null,
        entityId: payload.entityId ? String(payload.entityId) : null,
        description: payload.description,
        details: payload.details || null
      });
    } catch (error) {
      console.error('Error registrando historial del vehiculo:', error.message);
    }
  },

  async deleteVehicle(req, res) {
    try {
      const { id } = req.params;
      const existingVehicle = await vehicleModel.getVehicleById(id);

      if (!existingVehicle) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      const deletionResult = await vehicleModel.softDeleteVehicleCascade(id);
      if (!deletionResult) {
        return res.status(404).json({
          message: 'Vehiculo no encontrado'
        });
      }

      await vehicleController.logHistory(req, id, {
        module: 'vehiculos',
        action: 'eliminar',
        entityType: 'vehicle',
        entityId: id,
        description: `Elimino el vehiculo ${existingVehicle.numero_economico || existingVehicle.placa || id}`,
        details: {
          placa: existingVehicle.placa || null,
          numero_economico: existingVehicle.numero_economico || null,
          tipo_carro: existingVehicle.tipo_carro || null,
          summary: deletionResult.summary
        }
      });

      res.json({
        message: 'Vehiculo eliminado correctamente',
        vehicleId: id,
        summary: deletionResult.summary
      });
    } catch (error) {
      console.error('Error eliminando vehiculo:', error);
      res.status(500).json({
        message: 'Error al eliminar vehiculo',
        error: error.message
      });
    }
  },

  async listVehicles(req, res) {
    try {
      const vehicles = await vehicleModel.getActiveVehicles();
      const enrichedVehicles = await Promise.all(
        vehicles.map(async (vehicle) => ({
          ...vehicle,
          operationParameters: await vehicleModel.getVehicleParametersByVehicleId(vehicle.id)
        }))
      );
      res.json({
        message: 'Vehículos listados correctamente',
        count: enrichedVehicles.length,
        vehicles: enrichedVehicles
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
      } else if (
        req.body.numero_economico
        || req.body.tipo_carro
        || req.body.propietario_nombre
        || req.body.placa
        || req.body.numero_serie
        || req.body.marca
        || req.body.modelo
      ) {
        basicInfo = {
          numero_economico: req.body.numero_economico,
          tipo_carro: req.body.tipo_carro,
          propietario_nombre: req.body.propietario_nombre,
          placa: req.body.placa,
          numero_serie: req.body.numero_serie,
          marca: req.body.marca,
          modelo: req.body.modelo,
          color: req.body.color,
          capacidad_kg: req.body.capacidad_kg,
          descripcion: req.body.descripcion
        };
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
        
        if (!basicInfo.numero_economico?.trim()) missingFields.push('Numero Economico');
        if (!basicInfo.tipo_carro?.trim()) missingFields.push('Tipo de Carro');
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
        if (!VALID_VEHICLE_TYPES.includes(basicInfo.tipo_carro)) {
          return res.status(400).json({
            message: `Tipo de carro invalido. Opciones: ${VALID_VEHICLE_TYPES.join(', ')}`
          });
        }

        const duplicateResult = await vehicleModel.checkDuplicates(
          basicInfo.placa,
          basicInfo.numero_serie,
          basicInfo.numero_economico,
          id
        );
        if (duplicateResult) {
          return res.status(400).json({
            message: 'Placa, numero de serie o numero economico ya existen',
            duplicate: duplicateResult
          });
        }

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
      const uploadedPhotoTypes = [];
      const updatedDescriptionTypes = [];

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
            uploadedPhotoTypes.push(photoType);
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
            const previousPhoto = existingVehicle?.fotografias?.find((photo) => photo.tipo_foto === photoType);
            const nextDescription = req.body[`descripcion_${photoType}`] || '';
            if (normalizeText(previousPhoto?.descripcion) !== normalizeText(nextDescription)) {
              updatedDescriptionTypes.push(photoType);
            }
            await vehicleModel.updatePhotoDescriptionByType(
              id,
              photoType,
              nextDescription
            );
          } catch (descriptionError) {
            console.error(`Error actualizando descripcion de foto ${photoType}:`, descriptionError.message);
          }
        }
      }

      // 6. Retornar vehículo actualizado
      const updatedVehicle = await vehicleModel.getVehicleById(id);

      if (deletedPhotosCount > 0 || uploadedPhotoTypes.length > 0 || updatedDescriptionTypes.length > 0) {
        const changes = [];
        if (uploadedPhotoTypes.length > 0) changes.push(`agrego o reemplazo ${uploadedPhotoTypes.length} foto(s)`);
        if (deletedPhotosCount > 0) changes.push(`elimino ${deletedPhotosCount} foto(s)`);
        if (updatedDescriptionTypes.length > 0) changes.push(`actualizo ${updatedDescriptionTypes.length} descripcion(es)`);

        await vehicleController.logHistory(req, id, {
          module: 'fotos',
          action: 'actualizar',
          entityType: 'vehicle_photos',
          entityId: id,
          description: `Actualizo fotografias: ${changes.join(', ')}`,
          details: {
            fotos_agregadas: uploadedPhotoTypes.map((photoType) => ({
              field: photoType,
              label: getPhotoTypeLabel(photoType),
              action: 'agregar_o_reemplazar'
            })),
            fotos_eliminadas: Array.isArray(deletedPhotos)
              ? deletedPhotos.map((photoType) => ({
                  field: photoType,
                  label: getPhotoTypeLabel(photoType),
                  action: 'eliminar'
                }))
              : [],
            descripciones_actualizadas: updatedDescriptionTypes.map((photoType) => {
              const previousPhoto = existingVehicle?.fotografias?.find((photo) => photo.tipo_foto === photoType);
              return {
                field: `descripcion_${photoType}`,
                label: `Descripcion de ${getPhotoTypeLabel(photoType)}`,
                before: normalizeNullableText(previousPhoto?.descripcion),
                after: normalizeNullableText(req.body[`descripcion_${photoType}`] || '')
              };
            })
          }
        });
      }

      // Normalizar respuesta a camelCase para frontend
      res.json({
        ...updatedVehicle,
        documents: updatedVehicle.documentos || [],
        maintenanceRecords: updatedVehicle.mantenimientos || [],
        gasolineRecords: updatedVehicle.gasolina_registros || [],
        operationParameters: updatedVehicle.parametros_operativos || null,
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
      const normalizedVigencia = normalizeDocumentVigencia(vigencia, estatus);
      const documentData = {
        tipo_documento_id: parseInt(tipo_documento_id),
        ambito: ambito || 'federal',
        estado: estado || 'válido',
        dependencia_otorga,
        vigencia: normalizedVigencia,
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

      await vehicleController.logHistory(req, vehicleId, {
        module: 'documentos',
        action: 'crear',
        entityType: 'document',
        entityId: document.id,
        description: `Agrego el documento "${getDocumentTypeLabel(createdDocument)}"`,
        details: {
          tipo_documento_id: createdDocument?.tipo_documento_id || null,
          vigencia: createdDocument?.vigencia || null,
          archivos_adjuntos: archivosGuardados.length
        }
      });

      if (req.files && req.files.length > 0) {
        await vehicleController.logHistory(req, vehicleId, {
          module: 'documentos',
          action: 'agregar_archivo',
          entityType: 'document_file',
          entityId: document.id,
          description: `Agrego ${req.files.length} archivo(s) al documento "${getDocumentTypeLabel(createdDocument)}"`,
          details: {
            documento_id: document.id,
            archivos_agregados: req.files.map((file) => file.originalname)
          }
        });
      }

      console.error(`✅✅✅ [DOC_CREATE] documento_id=${document.id} archivos=${req.files?.length || 0}`);

      res.status(201).json({
        message: 'Documento creado exitosamente',
        document: createdDocument,
        archivosGuardados: archivosGuardados.length
      });
    } catch (error) {
      if (error.code === '23514' && error.constraint === 'vehiculo_documentos_estatus_check') {
        return res.status(400).json({
          message: 'La base de datos aun no permite el estatus "no_aplica" o "por_vencer" para documentos. Ejecuta la migracion 016.'
        });
      }
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
      const normalizedVigencia = normalizeDocumentVigencia(vigencia, estatus);
      const documentData = {
        tipo_documento_id: parseInt(tipo_documento_id),
        ambito: ambito || 'federal',
        estado: estado || 'válido',
        dependencia_otorga,
        vigencia: normalizedVigencia,
        folio_oficio,
        observaciones: observaciones || '',
        estatus: estatus || 'vigente',
        archivo_url: existingDoc.archivo_url,
        archivos_json: existingDoc.archivos_json
      };

      console.error(`💾 [DOC_UPDATE] guardando_en_BD archivo_url=${existingDoc.archivo_url || 'null'}`);

      const updatedDoc = await vehicleModel.updateDocument(vehicleId, docId, documentData);

      const enrichedUpdatedDoc = await vehicleModel.getDocumentById(vehicleId, docId);
      const changes = buildChanges(
        {
          tipo_documento_id: 'Tipo de documento',
          ambito: 'Ambito',
          estado: 'Estado',
          dependencia_otorga: 'Dependencia que otorga',
          vigencia: 'Vigencia',
          folio_oficio: 'Folio u oficio',
          observaciones: 'Observaciones',
          estatus: 'Estatus'
        },
        {
          tipo_documento_id: existingDoc?.tipo_documento_id ?? null,
          ambito: normalizeNullableText(existingDoc?.ambito),
          estado: normalizeNullableText(existingDoc?.estado),
          dependencia_otorga: normalizeNullableText(existingDoc?.dependencia_otorga),
          vigencia: normalizeNullableText(existingDoc?.vigencia),
          folio_oficio: normalizeNullableText(existingDoc?.folio_oficio),
          observaciones: normalizeNullableText(existingDoc?.observaciones),
          estatus: normalizeNullableText(existingDoc?.estatus)
        },
        {
          tipo_documento_id: Number.parseInt(tipo_documento_id, 10),
          ambito: normalizeNullableText(ambito || 'federal'),
          estado: normalizeNullableText(estado || 'vÃ¡lido'),
          dependencia_otorga: normalizeNullableText(dependencia_otorga),
          vigencia: normalizedVigencia,
          folio_oficio: normalizeNullableText(folio_oficio),
          observaciones: normalizeNullableText(observaciones || ''),
          estatus: normalizeNullableText(estatus || 'vigente')
        }
      );

      await vehicleController.logHistory(req, vehicleId, {
        module: 'documentos',
        action: 'actualizar',
        entityType: 'document',
        entityId: docId,
        description: `Actualizo el documento "${getDocumentTypeLabel(enrichedUpdatedDoc || existingDoc)}"`,
        details: {
          changes,
          archivos_nuevos: archivosGuardados.length
        }
      });

      if (req.files && req.files.length > 0) {
        await vehicleController.logHistory(req, vehicleId, {
          module: 'documentos',
          action: 'agregar_archivo',
          entityType: 'document_file',
          entityId: docId,
          description: `Agrego ${req.files.length} archivo(s) al documento "${getDocumentTypeLabel(enrichedUpdatedDoc || existingDoc)}"`,
          details: {
            documento_id: docId,
            archivos_agregados: req.files.map((file) => file.originalname)
          }
        });
      }

      console.error(`✅✅✅ [DOC_UPDATE] docId=${docId} archivos_nuevos=${archivosGuardados.length}`);

      res.json({
        message: 'Documento actualizado exitosamente',
        document: enrichedUpdatedDoc,
        archivosGuardados: req.files?.length || 0
      });
    } catch (error) {
      if (error.code === '23514' && error.constraint === 'vehiculo_documentos_estatus_check') {
        return res.status(400).json({
          message: 'La base de datos aun no permite el estatus "no_aplica" o "por_vencer" para documentos. Ejecuta la migracion 016.'
        });
      }
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

      await vehicleController.logHistory(req, vehicleId, {
        module: 'documentos',
        action: 'eliminar',
        entityType: 'document',
        entityId: docId,
        description: `Elimino el documento "${getDocumentTypeLabel(existingDoc)}"`,
        details: {
          tipo_documento_id: existingDoc?.tipo_documento_id || null,
          vigencia: existingDoc?.vigencia || null
        }
      });

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

      await vehicleController.logHistory(req, vehicleId, {
        module: 'documentos',
        action: 'eliminar_archivo',
        entityType: 'document_file',
        entityId: fileId,
        description: `Elimino un archivo adjunto del documento "${getDocumentTypeLabel(document)}"`,
        details: {
          documento_id: docId,
          archivo_id: fileId
        }
      });

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
