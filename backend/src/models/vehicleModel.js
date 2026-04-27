import pool, { query } from '../config/database.js';

const mapDocumentFileRow = (fileRow, vehicleId, documentId, index) => ({
  id: fileRow.id,
  nombre_original: fileRow.nombre_original,
  tipo_mime: fileRow.tipo_mime,
  tamaño: Number(fileRow.tamaño_bytes || 0),
  tamaño_bytes: Number(fileRow.tamaño_bytes || 0),
  orden: fileRow.orden ?? index + 1,
  download_url: `/api/vehicles/${vehicleId}/documents/${documentId}/download?fileIndex=${index}`
});

const buildLegacyDocumentFile = (document, vehicleId, documentId) => {
  if (!document?.archivo_url) return [];

  return [{
    id: null,
    nombre_original: document.archivo_url.split(/[\\/]/).pop() || 'documento.pdf',
    tipo_mime: null,
    tamaño: null,
    tamaño_bytes: null,
    orden: 1,
    download_url: `/api/vehicles/${vehicleId}/documents/${documentId}/download?fileIndex=0`,
    ruta_legacy: document.archivo_url
  }];
};

export const vehicleModel = {
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

  async checkDuplicates(placa, numeroSerie) {
    const result = await query(
      `SELECT id, placa, numero_serie
       FROM vehiculos
       WHERE deleted_at IS NULL AND (placa = $1 OR numero_serie = $2)
       LIMIT 1`,
      [placa, numeroSerie]
    );

    return result.rows[0] || null;
  },

  async createSafetyElement(vehicleId, elementData) {
    const { elemento_seguridad_id, estatus, observaciones } = elementData;

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

  async createDocument(vehicleId, documentData) {
    const {
      tipo_documento_id,
      ambito,
      estado,
      dependencia_otorga,
      vigencia,
      folio_oficio,
      observaciones,
      estatus,
      archivo_url,
      archivos_json
    } = documentData;

    try {
      const result = await query(
        `INSERT INTO vehiculo_documentos
         (vehiculo_id, tipo_documento_id, ambito, estado, dependencia_otorga, vigencia, folio_oficio, observaciones, estatus, archivo_url, archivos_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [vehicleId, tipo_documento_id, ambito, estado, dependencia_otorga, vigencia, folio_oficio, observaciones, estatus || 'vigente', archivo_url, archivos_json]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code !== '42703') {
        throw error;
      }

      const fallback = await query(
        `INSERT INTO vehiculo_documentos
         (vehiculo_id, tipo_documento_id, ambito, estado, dependencia_otorga, vigencia, folio_oficio, observaciones, estatus, archivo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [vehicleId, tipo_documento_id, ambito, estado, dependencia_otorga, vigencia, folio_oficio, observaciones, estatus || 'vigente', archivo_url]
      );

      return fallback.rows[0];
    }
  },

  async addDocumentFiles(documentId, files = []) {
    if (!files.length) return [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertedFiles = [];
      for (const [index, file] of files.entries()) {
        const result = await client.query(
          `INSERT INTO vehiculo_documento_archivos
           (vehiculo_documento_id, nombre_original, tipo_mime, tamaño_bytes, archivo_data, orden)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            documentId,
            file.originalname,
            file.mimetype,
            file.size,
            file.buffer,
            index + 1
          ]
        );

        insertedFiles.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return insertedFiles;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getDocumentFiles(documentId) {
    const result = await query(
      `SELECT id, vehiculo_documento_id, nombre_original, tipo_mime, tamaño_bytes, orden, created_at, archivo_data
       FROM vehiculo_documento_archivos
       WHERE vehiculo_documento_id = $1 AND deleted_at IS NULL
       ORDER BY orden ASC, created_at ASC`,
      [documentId]
    );

    return result.rows;
  },

  async getDocumentFilesMetadata(documentId) {
    const result = await query(
      `SELECT id, vehiculo_documento_id, nombre_original, tipo_mime, tamaño_bytes, orden, created_at
       FROM vehiculo_documento_archivos
       WHERE vehiculo_documento_id = $1 AND deleted_at IS NULL
       ORDER BY orden ASC, created_at ASC`,
      [documentId]
    );

    return result.rows;
  },

  async getDocumentFileByIndex(vehicleId, docId, fileIndex = 0) {
    const safeIndex = Number.isInteger(fileIndex) && fileIndex >= 0 ? fileIndex : 0;
    const result = await query(
      `SELECT
         d.id AS doc_id,
         d.archivo_url AS legacy_archivo_url,
         t.nombre AS tipo_nombre,
         f.id,
         f.nombre_original,
         f.tipo_mime,
         f.tamaño_bytes,
         f.archivo_data,
         f.orden
       FROM vehiculo_documentos d
       JOIN catalogo_tipos_documento_vehicular t ON d.tipo_documento_id = t.id
       LEFT JOIN vehiculo_documento_archivos f
         ON f.vehiculo_documento_id = d.id
        AND f.deleted_at IS NULL
       WHERE d.vehiculo_id = $1
         AND d.id = $2
         AND d.deleted_at IS NULL
       ORDER BY f.orden ASC NULLS LAST, f.created_at ASC NULLS LAST
       LIMIT 1 OFFSET $3`,
      [vehicleId, docId, safeIndex]
    );

    return result.rows[0] || null;
  },

  async deleteDocumentFile(documentId, fileId) {
    const result = await query(
      `UPDATE vehiculo_documento_archivos
       SET deleted_at = NOW()
       WHERE id = $1 AND vehiculo_documento_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [fileId, documentId]
    );

    return result.rows[0] || null;
  },

  async getVehicleById(vehicleId) {
    const vehicleResult = await query(
      `SELECT * FROM vehiculos WHERE id = $1 AND deleted_at IS NULL`,
      [vehicleId]
    );

    if (vehicleResult.rows.length === 0) {
      return null;
    }

    const vehicle = vehicleResult.rows[0];

    const docsResult = await query(
      `SELECT d.*, t.nombre as tipo_nombre
       FROM vehiculo_documentos d
       JOIN catalogo_tipos_documento_vehicular t ON d.tipo_documento_id = t.id
       WHERE d.vehiculo_id = $1 AND d.deleted_at IS NULL`,
      [vehicleId]
    );

    const safetyResult = await query(
      `SELECT e.*, s.nombre as elemento_nombre
       FROM vehiculo_elementos_seguridad e
       JOIN catalogo_elementos_seguridad s ON e.elemento_seguridad_id = s.id
       WHERE e.vehiculo_id = $1 AND e.deleted_at IS NULL`,
      [vehicleId]
    );

    const photosResult = await query(
      `SELECT * FROM vehiculo_fotografias
       WHERE vehiculo_id = $1 AND deleted_at IS NULL
       ORDER BY tipo_foto`,
      [vehicleId]
    );

    const documents = await Promise.all(
      docsResult.rows.map(async (document, index) => {
        const fileRows = await vehicleModel.getDocumentFilesMetadata(document.id);
        const normalizedFiles = fileRows.length > 0
          ? fileRows.map((fileRow, fileIndex) => mapDocumentFileRow(fileRow, vehicleId, document.id, fileIndex))
          : buildLegacyDocumentFile(document, vehicleId, document.id);

        return {
          ...document,
          archivos_json: JSON.stringify(normalizedFiles)
        };
      })
    );

    return {
      ...vehicle,
      documentos: documents,
      elementos_seguridad: safetyResult.rows,
      fotografias: photosResult.rows
    };
  },

  async getActiveVehicles() {
    const result = await query(
      `SELECT *
       FROM vehiculos
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`,
      []
    );

    return result.rows;
  },

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
      estado = 'activo'
    } = vehicleData;

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
        [propietario_nombre, placa, numero_serie, marca, modelo, color, capacidad_kg, descripcion, estado, vehicleId]
      );
      return result.rows[0];
    } catch (error) {
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

  async deleteSafetyElementsByVehicleId(vehicleId) {
    const result = await query(
      `DELETE FROM vehiculo_elementos_seguridad
       WHERE vehiculo_id = $1
       RETURNING *`,
      [vehicleId]
    );

    return result.rows;
  },

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

  async updateVehicleStatus(vehicleId, estado) {
    const result = await query(
      `UPDATE vehiculos
       SET estado = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [estado, vehicleId]
    );

    return result.rows[0];
  },

  async getDocumentById(vehicleId, docId) {
    const result = await query(
      `SELECT d.*, t.nombre as tipo_nombre
       FROM vehiculo_documentos d
       JOIN catalogo_tipos_documento_vehicular t ON d.tipo_documento_id = t.id
       WHERE d.vehiculo_id = $1 AND d.id = $2 AND d.deleted_at IS NULL`,
      [vehicleId, docId]
    );

    const document = result.rows[0] || null;
    if (!document) {
      return null;
    }

    const fileRows = await vehicleModel.getDocumentFilesMetadata(docId);
    const normalizedFiles = fileRows.length > 0
      ? fileRows.map((fileRow, index) => mapDocumentFileRow(fileRow, vehicleId, docId, index))
      : buildLegacyDocumentFile(document, vehicleId, docId);

    return {
      ...document,
      archivos_json: JSON.stringify(normalizedFiles)
    };
  },

  async updateDocument(vehicleId, docId, documentData) {
    const {
      tipo_documento_id,
      ambito,
      estado,
      dependencia_otorga,
      vigencia,
      folio_oficio,
      observaciones,
      estatus,
      archivo_url,
      archivos_json
    } = documentData;

    try {
      const result = await query(
        `UPDATE vehiculo_documentos
         SET tipo_documento_id = $1,
             ambito = $2,
             estado = $3,
             dependencia_otorga = $4,
             vigencia = $5,
             folio_oficio = $6,
             observaciones = $7,
             estatus = $8,
             archivo_url = $9,
             archivos_json = $10,
             updated_at = NOW()
         WHERE id = $11 AND vehiculo_id = $12 AND deleted_at IS NULL
         RETURNING *`,
        [tipo_documento_id, ambito, estado, dependencia_otorga, vigencia, folio_oficio, observaciones, estatus || 'vigente', archivo_url, archivos_json, docId, vehicleId]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code !== '42703') {
        throw error;
      }

      const fallback = await query(
        `UPDATE vehiculo_documentos
         SET tipo_documento_id = $1,
             ambito = $2,
             estado = $3,
             dependencia_otorga = $4,
             vigencia = $5,
             folio_oficio = $6,
             observaciones = $7,
             estatus = $8,
             archivo_url = $9,
             updated_at = NOW()
         WHERE id = $10 AND vehiculo_id = $11 AND deleted_at IS NULL
         RETURNING *`,
        [tipo_documento_id, ambito, estado, dependencia_otorga, vigencia, folio_oficio, observaciones, estatus || 'vigente', archivo_url, docId, vehicleId]
      );

      return fallback.rows[0];
    }
  },

  async deleteDocument(vehicleId, docId) {
    const result = await query(
      `UPDATE vehiculo_documentos
       SET deleted_at = NOW()
       WHERE vehiculo_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [vehicleId, docId]
    );

    await query(
      `UPDATE vehiculo_documento_archivos
       SET deleted_at = NOW()
       WHERE vehiculo_documento_id = $1 AND deleted_at IS NULL`,
      [docId]
    );

    return result.rows[0] || null;
  }
};
