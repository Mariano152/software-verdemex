import { query } from '../config/database.js';

export const expedienteModel = {
  // Obtener todos los expedientes de un vehículo
  async getExpedientesByVehiculeId(vehicleId) {
    const result = await query(
      `SELECT e.*, COUNT(ei.id) as total_items, 
              SUM(CASE WHEN ei.completado = true THEN 1 ELSE 0 END) as items_completados
       FROM expedientes e
       LEFT JOIN expediente_items ei ON e.id = ei.expediente_id AND ei.deleted_at IS NULL
       WHERE e.vehiculo_id = $1 AND e.deleted_at IS NULL
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [vehicleId]
    );

    return result.rows;
  },

  // Obtener un expediente con sus items
  async getExpedienteById(expedienteId) {
    const expediente = await query(
      `SELECT * FROM expedientes WHERE id = $1 AND deleted_at IS NULL`,
      [expedienteId]
    );

    if (expediente.rows.length === 0) {
      return null;
    }

    const items = await query(
      `SELECT * FROM expediente_items 
       WHERE expediente_id = $1 AND deleted_at IS NULL
       ORDER BY completado ASC, created_at DESC`,
      [expedienteId]
    );

    return {
      ...expediente.rows[0],
      items: items.rows
    };
  },

  // Crear expediente
  async createExpediente(vehicleId, data) {
    const { titulo, descripcion, prioridad = 'normal' } = data;

    const result = await query(
      `INSERT INTO expedientes (vehiculo_id, titulo, descripcion, prioridad)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [vehicleId, titulo, descripcion, prioridad]
    );

    return result.rows[0];
  },

  // Actualizar expediente
  async updateExpediente(expedienteId, data) {
    const { titulo, descripcion, estado, prioridad } = data;

    const result = await query(
      `UPDATE expedientes 
       SET titulo = COALESCE($1, titulo),
           descripcion = COALESCE($2, descripcion),
           estado = COALESCE($3, estado),
           prioridad = COALESCE($4, prioridad),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [titulo, descripcion, estado, prioridad, expedienteId]
    );

    return result.rows[0];
  },

  // Crear item en expediente
  async createExpedienteItem(expedienteId, data) {
    const { contenido, tipo_item = 'actividad', fecha_vencimiento, notas } = data;

    const result = await query(
      `INSERT INTO expediente_items (expediente_id, contenido, tipo_item, fecha_vencimiento, notas)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [expedienteId, contenido, tipo_item, fecha_vencimiento, notas]
    );

    return result.rows[0];
  },

  // Actualizar item de expediente
  async updateExpedienteItem(itemId, data) {
    const { contenido, estado_item, completado, fecha_vencimiento, notas } = data;

    const result = await query(
      `UPDATE expediente_items 
       SET contenido = COALESCE($1, contenido),
           estado_item = COALESCE($2, estado_item),
           completado = COALESCE($3, completado),
           fecha_vencimiento = COALESCE($4, fecha_vencimiento),
           notas = COALESCE($5, notas),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [contenido, estado_item, completado, fecha_vencimiento, notas, itemId]
    );

    return result.rows[0];
  },

  // Marcar item como completado
  async toggleItemCompletion(itemId) {
    const result = await query(
      `UPDATE expediente_items 
       SET completado = NOT completado,
           estado_item = CASE 
             WHEN NOT completado THEN 'completado'
             ELSE 'pendiente'
           END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [itemId]
    );

    return result.rows[0];
  },

  // Eliminar item (soft delete)
  async deleteExpedienteItem(itemId) {
    const result = await query(
      `UPDATE expediente_items 
       SET deleted_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [itemId]
    );

    return result.rows[0];
  },

  // Eliminar expediente (soft delete)
  async deleteExpediente(expedienteId) {
    const result = await query(
      `UPDATE expedientes 
       SET deleted_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [expedienteId]
    );

    return result.rows[0];
  }
};
