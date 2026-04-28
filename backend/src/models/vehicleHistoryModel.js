import { query } from '../config/database.js';

const mapHistoryRow = (row) => ({
  ...row,
  usuario_nombre: row.usuario_nombre || row.usuario_email || 'Sistema'
});

export const vehicleHistoryModel = {
  async createEntry({
    vehicleId,
    userId = null,
    module,
    action,
    entityType = null,
    entityId = null,
    description,
    details = null
  }) {
    try {
      const result = await query(
        `INSERT INTO vehiculo_historial_cambios
         (vehiculo_id, usuario_id, modulo, accion, entidad_tipo, entidad_id, descripcion, detalles_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [vehicleId, userId, module, action, entityType, entityId, description, details ? JSON.stringify(details) : null]
      );

      return result.rows[0] || null;
    } catch (error) {
      if (error.code === '42P01') {
        return null;
      }
      throw error;
    }
  },

  async getHistoryByVehicleId(vehicleId, options = {}) {
    const limit = Number.isInteger(options.limit) && options.limit > 0
      ? options.limit
      : null;

    try {
      const params = [vehicleId];
      let sql = `
        SELECT
          h.*,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.email,
            'Sistema'
          ) AS usuario_nombre,
          u.email AS usuario_email
        FROM vehiculo_historial_cambios h
        LEFT JOIN users u ON u.id = h.usuario_id
        WHERE h.vehiculo_id = $1
        ORDER BY h.created_at DESC
      `;

      if (limit) {
        params.push(limit);
        sql += ' LIMIT $2';
      }

      const result = await query(sql, params);
      return result.rows.map(mapHistoryRow);
    } catch (error) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }
};
