import { query } from '../config/database.js';
import pool from '../config/database.js';

const DRIVER_DOCUMENT_TYPE_LABELS = {
  1: 'Licencia de conducir',
  2: 'Acto medico',
  3: 'INE o identificacion oficial',
  4: 'R control'
};

const mapDriverDocumentFileRow = (fileRow, driverId, documentId, index = 0) => ({
  id: fileRow.id,
  nombre_original: fileRow.nombre_original,
  tipo_mime: fileRow.tipo_mime,
  tamano_bytes: fileRow.tamano_bytes,
  orden: fileRow.orden,
  created_at: fileRow.created_at,
  download_url: `/api/drivers/${driverId}/documents/${documentId}/download?fileIndex=${index}`
});

const mapDriverHistoryFileRow = (fileRow, driverId, historyId, index = 0) => ({
  id: fileRow.id,
  nombre_original: fileRow.nombre_original,
  tipo_mime: fileRow.tipo_mime,
  tamano_bytes: fileRow.tamano_bytes,
  orden: fileRow.orden,
  created_at: fileRow.created_at,
  download_url: `/api/drivers/${driverId}/history/${historyId}/download?fileIndex=${index}`
});

const mapDriverRatingFileRow = (fileRow, driverId, ratingId, index = 0) => ({
  id: fileRow.id,
  nombre_original: fileRow.nombre_original,
  tipo_mime: fileRow.tipo_mime,
  tamano_bytes: fileRow.tamano_bytes,
  orden: fileRow.orden,
  created_at: fileRow.created_at,
  download_url: `/api/drivers/${driverId}/ratings/${ratingId}/download?fileIndex=${index}`
});

const BASE_SELECT = `
  SELECT
    id,
    nombre,
    telefono,
    numero_seguro_social,
    domicilio,
    imagen_url,
    COALESCE((
      SELECT ROUND(AVG(r.calificacion)::numeric, 1)
      FROM conductor_ratings_semanales r
      WHERE r.conductor_id = conductores.id
        AND r.deleted_at IS NULL
    ), 0) AS rating,
    descripcion,
    created_at,
    updated_at
  FROM conductores
  WHERE deleted_at IS NULL
`;

export const driverModel = {
  async listDrivers() {
    const result = await query(
      `${BASE_SELECT}
       ORDER BY LOWER(nombre) ASC, created_at DESC`
    );

    return result.rows;
  },

  async getDriverById(driverId) {
    const result = await query(
      `${BASE_SELECT} AND id = $1`,
      [driverId]
    );

    return result.rows[0] || null;
  },

  async getDriverBySocialSecurityNumber(numeroSeguroSocial, excludeId = null) {
    const params = [numeroSeguroSocial];
    let sql = `
      SELECT id, numero_seguro_social
      FROM conductores
      WHERE numero_seguro_social = $1
        AND deleted_at IS NULL
    `;

    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id <> $${params.length}`;
    }

    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async createDriver(driverData) {
    const result = await query(
      `INSERT INTO conductores (
        nombre,
        telefono,
        numero_seguro_social,
        domicilio,
        imagen_url,
        descripcion
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        nombre,
        telefono,
        numero_seguro_social,
        domicilio,
        imagen_url,
        rating,
        descripcion,
        created_at,
        updated_at`,
      [
        driverData.nombre,
        driverData.telefono,
        driverData.numero_seguro_social,
        driverData.domicilio,
        driverData.imagen_url,
        driverData.descripcion
      ]
    );

    return result.rows[0];
  },

  async updateDriver(driverId, driverData) {
    const result = await query(
      `UPDATE conductores
       SET nombre = $1,
           telefono = $2,
           numero_seguro_social = $3,
           domicilio = $4,
           imagen_url = $5,
           descripcion = $6,
           updated_at = NOW()
       WHERE id = $7
         AND deleted_at IS NULL
       RETURNING
         id,
         nombre,
         telefono,
         numero_seguro_social,
         domicilio,
         imagen_url,
         rating,
         descripcion,
         created_at,
         updated_at`,
      [
        driverData.nombre,
        driverData.telefono,
        driverData.numero_seguro_social,
        driverData.domicilio,
        driverData.imagen_url,
        driverData.descripcion,
        driverId
      ]
    );

    return result.rows[0] || null;
  },

  async getDriverDocuments(driverId) {
    const result = await query(
      `SELECT *
       FROM conductor_documentos
       WHERE conductor_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [driverId]
    );

    const documents = await Promise.all(
      result.rows.map(async (document) => {
        const fileRows = await driverModel.getDriverDocumentFilesMetadata(document.id);
        return {
          ...document,
          tipo_nombre: DRIVER_DOCUMENT_TYPE_LABELS[document.tipo_documento_id] || 'Documento',
          archivos_json: JSON.stringify(
            fileRows.map((fileRow, index) => mapDriverDocumentFileRow(fileRow, driverId, document.id, index))
          )
        };
      })
    );

    return documents;
  },

  async getDriverDocumentById(driverId, docId) {
    const result = await query(
      `SELECT *
       FROM conductor_documentos
       WHERE conductor_id = $1
         AND id = $2
         AND deleted_at IS NULL`,
      [driverId, docId]
    );

    const document = result.rows[0] || null;
    if (!document) return null;

    const fileRows = await driverModel.getDriverDocumentFilesMetadata(docId);
    return {
      ...document,
      tipo_nombre: DRIVER_DOCUMENT_TYPE_LABELS[document.tipo_documento_id] || 'Documento',
      archivos_json: JSON.stringify(
        fileRows.map((fileRow, index) => mapDriverDocumentFileRow(fileRow, driverId, docId, index))
      )
    };
  },

  async createDriverDocument(driverId, documentData) {
    const result = await query(
      `INSERT INTO conductor_documentos (
        conductor_id,
        nombre_documento,
        tipo_documento_id,
        vigencia,
        observaciones,
        estatus
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        driverId,
        documentData.nombre_documento,
        documentData.tipo_documento_id,
        documentData.vigencia,
        documentData.observaciones,
        documentData.estatus
      ]
    );

    return result.rows[0] || null;
  },

  async updateDriverDocument(driverId, docId, documentData) {
    const result = await query(
      `UPDATE conductor_documentos
       SET nombre_documento = $1,
           tipo_documento_id = $2,
           vigencia = $3,
           observaciones = $4,
           estatus = $5,
           updated_at = NOW()
       WHERE conductor_id = $6
         AND id = $7
         AND deleted_at IS NULL
       RETURNING *`,
      [
        documentData.nombre_documento,
        documentData.tipo_documento_id,
        documentData.vigencia,
        documentData.observaciones,
        documentData.estatus,
        driverId,
        docId
      ]
    );

    return result.rows[0] || null;
  },

  async deleteDriverDocument(driverId, docId) {
    const result = await query(
      `UPDATE conductor_documentos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE conductor_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *`,
      [driverId, docId]
    );

    await query(
      `UPDATE conductor_documento_archivos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE conductor_documento_id = $1
         AND deleted_at IS NULL`,
      [docId]
    );

    return result.rows[0] || null;
  },

  async addDriverDocumentFiles(documentId, files = []) {
    if (!files.length) return [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertedFiles = [];

      for (const [index, file] of files.entries()) {
        const result = await client.query(
          `INSERT INTO conductor_documento_archivos
           (conductor_documento_id, nombre_original, tipo_mime, tamano_bytes, archivo_data, orden)
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

  async getDriverDocumentFilesMetadata(documentId) {
    const result = await query(
      `SELECT id, conductor_documento_id, nombre_original, tipo_mime, tamano_bytes, orden, created_at
       FROM conductor_documento_archivos
       WHERE conductor_documento_id = $1
         AND deleted_at IS NULL
       ORDER BY orden ASC, created_at ASC`,
      [documentId]
    );

    return result.rows;
  },

  async getDriverDocumentFileByIndex(driverId, docId, fileIndex = 0) {
    const safeIndex = Number.isInteger(fileIndex) && fileIndex >= 0 ? fileIndex : 0;
    const result = await query(
      `SELECT
         d.id AS doc_id,
         d.tipo_documento_id,
         f.id,
         f.nombre_original,
         f.tipo_mime,
         f.tamano_bytes,
         f.archivo_data,
         f.orden
       FROM conductor_documentos d
       LEFT JOIN conductor_documento_archivos f
         ON f.conductor_documento_id = d.id
        AND f.deleted_at IS NULL
       WHERE d.conductor_id = $1
         AND d.id = $2
         AND d.deleted_at IS NULL
       ORDER BY f.orden ASC NULLS LAST, f.created_at ASC NULLS LAST
       LIMIT 1 OFFSET $3`,
      [driverId, docId, safeIndex]
    );

    return result.rows[0] || null;
  },

  async deleteDriverDocumentFile(docId, fileId) {
    const result = await query(
      `UPDATE conductor_documento_archivos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND conductor_documento_id = $2
         AND deleted_at IS NULL
       RETURNING *`,
      [fileId, docId]
    );

    return result.rows[0] || null;
  },

  async listDriverHistory(driverId) {
    const result = await query(
      `SELECT *
       FROM conductor_historial
       WHERE conductor_id = $1
         AND deleted_at IS NULL
       ORDER BY fecha_registro DESC, created_at DESC`,
      [driverId]
    );

    return Promise.all(
      result.rows.map(async (entry) => {
        const fileRows = await driverModel.getDriverHistoryFilesMetadata(entry.id);
        return {
          ...entry,
          archivos_json: JSON.stringify(
            fileRows.map((fileRow, index) => mapDriverHistoryFileRow(fileRow, driverId, entry.id, index))
          )
        };
      })
    );
  },

  async getDriverHistoryById(driverId, historyId) {
    const result = await query(
      `SELECT *
       FROM conductor_historial
       WHERE conductor_id = $1
         AND id = $2
         AND deleted_at IS NULL`,
      [driverId, historyId]
    );

    const entry = result.rows[0] || null;
    if (!entry) return null;

    const fileRows = await driverModel.getDriverHistoryFilesMetadata(historyId);
    return {
      ...entry,
      archivos_json: JSON.stringify(
        fileRows.map((fileRow, index) => mapDriverHistoryFileRow(fileRow, driverId, historyId, index))
      )
    };
  },

  async createDriverHistory(driverId, historyData) {
    const result = await query(
      `INSERT INTO conductor_historial (
        conductor_id,
        nombre,
        fecha_registro,
        descripcion
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [driverId, historyData.nombre, historyData.fecha_registro, historyData.descripcion]
    );

    return result.rows[0] || null;
  },

  async updateDriverHistory(driverId, historyId, historyData) {
    const result = await query(
      `UPDATE conductor_historial
       SET nombre = $1,
           fecha_registro = $2,
           descripcion = $3,
           updated_at = NOW()
       WHERE conductor_id = $4
         AND id = $5
         AND deleted_at IS NULL
       RETURNING *`,
      [historyData.nombre, historyData.fecha_registro, historyData.descripcion, driverId, historyId]
    );

    return result.rows[0] || null;
  },

  async deleteDriverHistory(driverId, historyId) {
    const result = await query(
      `UPDATE conductor_historial
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE conductor_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *`,
      [driverId, historyId]
    );

    await query(
      `UPDATE conductor_historial_archivos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE conductor_historial_id = $1
         AND deleted_at IS NULL`,
      [historyId]
    );

    return result.rows[0] || null;
  },

  async addDriverHistoryFiles(historyId, files = []) {
    if (!files.length) return [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertedFiles = [];

      for (const [index, file] of files.entries()) {
        const result = await client.query(
          `INSERT INTO conductor_historial_archivos
           (conductor_historial_id, nombre_original, tipo_mime, tamano_bytes, archivo_data, orden)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [historyId, file.originalname, file.mimetype, file.size, file.buffer, index + 1]
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

  async getDriverHistoryFilesMetadata(historyId) {
    const result = await query(
      `SELECT id, conductor_historial_id, nombre_original, tipo_mime, tamano_bytes, orden, created_at
       FROM conductor_historial_archivos
       WHERE conductor_historial_id = $1
         AND deleted_at IS NULL
       ORDER BY orden ASC, created_at ASC`,
      [historyId]
    );

    return result.rows;
  },

  async getDriverHistoryFileByIndex(driverId, historyId, fileIndex = 0) {
    const safeIndex = Number.isInteger(fileIndex) && fileIndex >= 0 ? fileIndex : 0;
    const result = await query(
      `SELECT
         h.id AS history_id,
         f.id,
         f.nombre_original,
         f.tipo_mime,
         f.tamano_bytes,
         f.archivo_data,
         f.orden
       FROM conductor_historial h
       LEFT JOIN conductor_historial_archivos f
         ON f.conductor_historial_id = h.id
        AND f.deleted_at IS NULL
       WHERE h.conductor_id = $1
         AND h.id = $2
         AND h.deleted_at IS NULL
       ORDER BY f.orden ASC NULLS LAST, f.created_at ASC NULLS LAST
       LIMIT 1 OFFSET $3`,
      [driverId, historyId, safeIndex]
    );

    return result.rows[0] || null;
  },

  async deleteDriverHistoryFile(historyId, fileId) {
    const result = await query(
      `UPDATE conductor_historial_archivos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND conductor_historial_id = $2
         AND deleted_at IS NULL
       RETURNING *`,
      [fileId, historyId]
    );

    return result.rows[0] || null;
  },

  async listDriverRatings(driverId) {
    const result = await query(
      `SELECT *
       FROM conductor_ratings_semanales
       WHERE conductor_id = $1
         AND deleted_at IS NULL
       ORDER BY rating_year DESC, week_number DESC, created_at DESC`,
      [driverId]
    );

    return Promise.all(
      result.rows.map(async (entry) => {
        const fileRows = await driverModel.getDriverRatingFilesMetadata(entry.id);
        return {
          ...entry,
          archivos_json: JSON.stringify(
            fileRows.map((fileRow, index) => mapDriverRatingFileRow(fileRow, driverId, entry.id, index))
          )
        };
      })
    );
  },

  async getDriverRatingById(driverId, ratingId) {
    const result = await query(
      `SELECT *
       FROM conductor_ratings_semanales
       WHERE conductor_id = $1
         AND id = $2
         AND deleted_at IS NULL`,
      [driverId, ratingId]
    );

    const entry = result.rows[0] || null;
    if (!entry) return null;

    const fileRows = await driverModel.getDriverRatingFilesMetadata(ratingId);
    return {
      ...entry,
      archivos_json: JSON.stringify(
        fileRows.map((fileRow, index) => mapDriverRatingFileRow(fileRow, driverId, ratingId, index))
      )
    };
  },

  async createDriverRating(driverId, ratingData) {
    const result = await query(
      `INSERT INTO conductor_ratings_semanales (
        conductor_id,
        fecha_registro,
        rating_year,
        week_number,
        semana_inicio,
        semana_fin,
        calificacion,
        descripcion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        driverId,
        ratingData.fecha_registro,
        ratingData.rating_year,
        ratingData.week_number,
        ratingData.semana_inicio,
        ratingData.semana_fin,
        ratingData.calificacion,
        ratingData.descripcion
      ]
    );

    return result.rows[0] || null;
  },

  async updateDriverRating(driverId, ratingId, ratingData) {
    const result = await query(
      `UPDATE conductor_ratings_semanales
       SET fecha_registro = $1,
           rating_year = $2,
           week_number = $3,
           semana_inicio = $4,
           semana_fin = $5,
           calificacion = $6,
           descripcion = $7,
           updated_at = NOW()
       WHERE conductor_id = $8
         AND id = $9
         AND deleted_at IS NULL
       RETURNING *`,
      [
        ratingData.fecha_registro,
        ratingData.rating_year,
        ratingData.week_number,
        ratingData.semana_inicio,
        ratingData.semana_fin,
        ratingData.calificacion,
        ratingData.descripcion,
        driverId,
        ratingId
      ]
    );

    return result.rows[0] || null;
  },

  async getDriverRatingByWeek(driverId, ratingYear, weekNumber, excludeRatingId = null) {
    const params = [driverId, ratingYear, weekNumber];
    let sql = `
      SELECT id, conductor_id, rating_year, week_number
      FROM conductor_ratings_semanales
      WHERE conductor_id = $1
        AND rating_year = $2
        AND week_number = $3
        AND deleted_at IS NULL
    `;

    if (excludeRatingId) {
      params.push(excludeRatingId);
      sql += ` AND id <> $${params.length}`;
    }

    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async deleteDriverRating(driverId, ratingId) {
    const result = await query(
      `UPDATE conductor_ratings_semanales
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE conductor_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *`,
      [driverId, ratingId]
    );

    await query(
      `UPDATE conductor_rating_archivos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE conductor_rating_id = $1
         AND deleted_at IS NULL`,
      [ratingId]
    );

    return result.rows[0] || null;
  },

  async addDriverRatingFiles(ratingId, files = []) {
    if (!files.length) return [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertedFiles = [];

      for (const [index, file] of files.entries()) {
        const result = await client.query(
          `INSERT INTO conductor_rating_archivos
           (conductor_rating_id, nombre_original, tipo_mime, tamano_bytes, archivo_data, orden)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [ratingId, file.originalname, file.mimetype, file.size, file.buffer, index + 1]
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

  async getDriverRatingFilesMetadata(ratingId) {
    const result = await query(
      `SELECT id, conductor_rating_id, nombre_original, tipo_mime, tamano_bytes, orden, created_at
       FROM conductor_rating_archivos
       WHERE conductor_rating_id = $1
         AND deleted_at IS NULL
       ORDER BY orden ASC, created_at ASC`,
      [ratingId]
    );

    return result.rows;
  },

  async getDriverRatingFileByIndex(driverId, ratingId, fileIndex = 0) {
    const safeIndex = Number.isInteger(fileIndex) && fileIndex >= 0 ? fileIndex : 0;
    const result = await query(
      `SELECT
         r.id AS rating_id,
         f.id,
         f.nombre_original,
         f.tipo_mime,
         f.tamano_bytes,
         f.archivo_data,
         f.orden
       FROM conductor_ratings_semanales r
       LEFT JOIN conductor_rating_archivos f
         ON f.conductor_rating_id = r.id
        AND f.deleted_at IS NULL
       WHERE r.conductor_id = $1
         AND r.id = $2
         AND r.deleted_at IS NULL
       ORDER BY f.orden ASC NULLS LAST, f.created_at ASC NULLS LAST
       LIMIT 1 OFFSET $3`,
      [driverId, ratingId, safeIndex]
    );

    return result.rows[0] || null;
  },

  async deleteDriverRatingFile(ratingId, fileId) {
    const result = await query(
      `UPDATE conductor_rating_archivos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND conductor_rating_id = $2
         AND deleted_at IS NULL
       RETURNING *`,
      [fileId, ratingId]
    );

    return result.rows[0] || null;
  },

  async listEmergencyContacts(driverId) {
    const result = await query(
      `SELECT
        id,
        conductor_id,
        nombre,
        parentesco,
        numero_telefono,
        created_at,
        updated_at
       FROM conductor_contactos_emergencia
       WHERE conductor_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [driverId]
    );

    return result.rows;
  },

  async createEmergencyContact(driverId, contactData) {
    const result = await query(
      `INSERT INTO conductor_contactos_emergencia (
        conductor_id,
        nombre,
        parentesco,
        numero_telefono
      ) VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        conductor_id,
        nombre,
        parentesco,
        numero_telefono,
        created_at,
        updated_at`,
      [
        driverId,
        contactData.nombre,
        contactData.parentesco,
        contactData.numero_telefono
      ]
    );

    return result.rows[0] || null;
  },

  async updateEmergencyContact(driverId, contactId, contactData) {
    const result = await query(
      `UPDATE conductor_contactos_emergencia
       SET nombre = $1,
           parentesco = $2,
           numero_telefono = $3,
           updated_at = NOW()
       WHERE conductor_id = $4
         AND id = $5
         AND deleted_at IS NULL
       RETURNING
         id,
         conductor_id,
         nombre,
         parentesco,
         numero_telefono,
         created_at,
         updated_at`,
      [
        contactData.nombre,
        contactData.parentesco,
        contactData.numero_telefono,
        driverId,
        contactId
      ]
    );

    return result.rows[0] || null;
  },

  async deleteEmergencyContact(driverId, contactId) {
    const result = await query(
      `UPDATE conductor_contactos_emergencia
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE conductor_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING id`,
      [driverId, contactId]
    );

    return result.rows[0] || null;
  }
};
