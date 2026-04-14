import { query } from '../config/database.js';

export const vehicleModel = {
  // Crear vehículo
  async createVehicle(vehicleData) {
    const {
      propietario_nombre,
      placa,
      numero_serie,
      marca,
      modelo,
      color,
      capacidad_kg,
      descripcion,
      imagen_url
    } = vehicleData;

    const result = await query(
      `INSERT INTO vehiculos 
       (propietario_nombre, placa, numero_serie, marca, modelo, color, capacidad_kg, descripcion, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [propietario_nombre, placa, numero_serie, marca, modelo, color, capacidad_kg, descripcion, imagen_url]
    );

    return result.rows[0];
  },

  // Crear documento de vehículo
  async createDocument(vehicleId, documentData) {
    const {
      tipo_documento_id,
      ambito,
      estado,
      dependencia_otorga,
      vigencia,
      folio_oficio,
      observaciones,
      estatus
    } = documentData;

    const result = await query(
      `INSERT INTO vehiculo_documentos 
       (vehiculo_id, tipo_documento_id, ambito, estado, dependencia_otorga, vigencia, folio_oficio, observaciones, estatus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [vehicleId, tipo_documento_id, ambito, estado, dependencia_otorga, vigencia, folio_oficio, observaciones, estatus || 'vigente']
    );

    return result.rows[0];
  },

  // Crear elemento de seguridad
  async createSafetyElement(vehicleId, elementData) {
    const { elemento_seguridad_id, estatus, observaciones } = elementData;

    // Primero intenta hacer UPSERT (insert or update)
    const result = await query(
      `INSERT INTO vehiculo_elementos_seguridad 
       (vehiculo_id, elemento_seguridad_id, estatus, observaciones, deleted_at)
       VALUES ($1, $2, $3, $4, NULL)
       ON CONFLICT (vehiculo_id, elemento_seguridad_id) 
       DO UPDATE SET estatus = $3, observaciones = $4, deleted_at = NULL, updated_at = NOW()
       RETURNING *`,
      [vehicleId, elemento_seguridad_id, estatus, observaciones]
    );

    return result.rows[0];
  },

  // Crear fotografía
  async createPhoto(vehicleId, photoData) {
    const {
      tipo_foto,
      archivo_url,
      descripcion,
      categoria = 'general'
    } = photoData;

    const result = await query(
      `INSERT INTO vehiculo_fotografias 
       (vehiculo_id, tipo_foto, archivo_url, descripcion, categoria, fecha_foto)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [vehicleId, tipo_foto, archivo_url, descripcion, categoria]
    );

    return result.rows[0];
  },

  // Obtener vehículo con toda su información
  async getVehicleById(vehicleId) {
    const vehicleResult = await query(
      `SELECT * FROM vehiculos WHERE id = $1 AND deleted_at IS NULL`,
      [vehicleId]
    );

    if (vehicleResult.rows.length === 0) {
      return null;
    }

    const vehicle = vehicleResult.rows[0];

    // Obtener documentos
    const docsResult = await query(
      `SELECT d.*, t.nombre as tipo_nombre 
       FROM vehiculo_documentos d
       JOIN catalogo_tipos_documento_vehicular t ON d.tipo_documento_id = t.id
       WHERE d.vehiculo_id = $1 AND d.deleted_at IS NULL`,
      [vehicleId]
    );

    // Obtener elementos de seguridad
    const safetyResult = await query(
      `SELECT e.*, s.nombre as elemento_nombre 
       FROM vehiculo_elementos_seguridad e
       JOIN catalogo_elementos_seguridad s ON e.elemento_seguridad_id = s.id
       WHERE e.vehiculo_id = $1 AND e.deleted_at IS NULL`,
      [vehicleId]
    );

    // Obtener fotografías
    const photosResult = await query(
      `SELECT * FROM vehiculo_fotografias 
       WHERE vehiculo_id = $1 AND deleted_at IS NULL
       ORDER BY tipo_foto`,
      [vehicleId]
    );

    return {
      ...vehicle,
      documentos: docsResult.rows,
      elementos_seguridad: safetyResult.rows,
      fotografias: photosResult.rows
    };
  },

  // Listar vehículos activos
  async getActiveVehicles() {
    const result = await query(
      `SELECT * FROM vehiculos WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );

    return result.rows;
  },

  // Verificar si placa/serie ya existen
  async checkDuplicates(placa, numero_serie) {
    const result = await query(
      `SELECT * FROM vehiculos 
       WHERE (placa = $1 OR numero_serie = $2) AND deleted_at IS NULL`,
      [placa, numero_serie]
    );

    return result.rows;
  },

  // Actualizar vehículo
  async updateVehicle(vehicleId, vehicleData) {
    const {
      propietario_nombre,
      placa,
      numero_serie,
      marca,
      modelo,
      color,
      capacidad_kg,
      descripcion,
      estado
    } = vehicleData;

    // Intentar actualizar con estado, si falla, actualizar sin estado (para compatibilidad)
    try {
      const result = await query(
        `UPDATE vehiculos 
         SET propietario_nombre = $1, 
             placa = $2, 
             numero_serie = $3, 
             marca = $4, 
             modelo = $5, 
             color = $6, 
             capacidad_kg = $7, 
             descripcion = $8,
             estado = $9,
             updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [propietario_nombre, placa, numero_serie, marca, modelo, color, capacidad_kg, descripcion, estado || 'activo', vehicleId]
      );
      return result.rows[0];
    } catch (error) {
      // Si la columna estado no existe, actualizar sin ella
      console.warn('⚠️ Campo estado no disponible, actualizando sin estado:', error.message);
      const result = await query(
        `UPDATE vehiculos 
         SET propietario_nombre = $1, 
             placa = $2, 
             numero_serie = $3, 
             marca = $4, 
             modelo = $5, 
             color = $6, 
             capacidad_kg = $7, 
             descripcion = $8,
             updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [propietario_nombre, placa, numero_serie, marca, modelo, color, capacidad_kg, descripcion, vehicleId]
      );
      return result.rows[0];
    }
  },

  // Eliminar (soft delete) documentos por vehículo
  async deleteDocumentsByVehicleId(vehicleId) {
    const result = await query(
      `UPDATE vehiculo_documentos 
       SET deleted_at = NOW()
       WHERE vehiculo_id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [vehicleId]
    );

    return result.rows;
  },

  // Eliminar (hard delete) elementos de seguridad por vehículo
  async deleteSafetyElementsByVehicleId(vehicleId) {
    const result = await query(
      `DELETE FROM vehiculo_elementos_seguridad 
       WHERE vehiculo_id = $1
       RETURNING *`,
      [vehicleId]
    );

    return result.rows;
  },

  // Eliminar (soft delete) foto por tipo
  async deletePhotoByType(vehicleId, fotoType) {
    const result = await query(
      `UPDATE vehiculo_fotografias 
       SET deleted_at = NOW()
       WHERE vehiculo_id = $1 AND tipo_foto = $2 AND deleted_at IS NULL
       RETURNING *`,
      [vehicleId, fotoType]
    );

    return result.rows;
  },

  // Actualizar estado del vehículo
  async updateVehicleStatus(vehicleId, estado) {
    if (!['activo', 'inactivo', 'en_mantenimiento'].includes(estado)) {
      throw new Error(`Estado inválido: ${estado}`);
    }

    try {
      const result = await query(
        `UPDATE vehiculos 
         SET estado = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [estado, vehicleId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error actualizando estado:', error.message);
      throw error;
    }
  }
};
