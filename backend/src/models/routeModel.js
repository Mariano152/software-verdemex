import { query } from '../config/database.js';

const BASE_ROUTE_SELECT = `
  SELECT
    r.*,
    c.nombre AS conductor_nombre,
    c.telefono AS conductor_telefono,
    v.placa AS vehiculo_placa,
    v.numero_economico AS vehiculo_numero_economico,
    v.tipo_carro AS vehiculo_tipo_carro,
    v.marca AS vehiculo_marca,
    v.modelo AS vehiculo_modelo
  FROM rutas r
  JOIN conductores c
    ON c.id = r.conductor_id
   AND c.deleted_at IS NULL
  JOIN vehiculos v
    ON v.id = r.vehiculo_id
   AND v.deleted_at IS NULL
  WHERE r.deleted_at IS NULL
`;

export const routeModel = {
  async listRoutes() {
    const result = await query(
      `${BASE_ROUTE_SELECT}
       ORDER BY r.fecha_entrega ASC, r.created_at DESC`
    );

    return result.rows;
  },

  async getRouteById(routeId) {
    const result = await query(
      `${BASE_ROUTE_SELECT}
       AND r.id = $1`,
      [routeId]
    );

    return result.rows[0] || null;
  },

  async createRoute(routeData) {
    const result = await query(
      `INSERT INTO rutas (
        conductor_id,
        vehiculo_id,
        origen,
        destino,
        kilometros_programados,
        metros_cubicos_enviados,
        tipo_unidad,
        fecha_registro,
        fecha_entrega,
        observaciones,
        descripcion,
        valor_monetario,
        estatus
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        routeData.conductor_id,
        routeData.vehiculo_id,
        routeData.origen,
        routeData.destino,
        routeData.kilometros_programados,
        routeData.metros_cubicos_enviados,
        routeData.tipo_unidad,
        routeData.fecha_registro,
        routeData.fecha_entrega,
        routeData.observaciones,
        routeData.descripcion,
        routeData.valor_monetario,
        routeData.estatus
      ]
    );

    return routeModel.getRouteById(result.rows[0].id);
  },

  async updateRoute(routeId, routeData) {
    const result = await query(
      `UPDATE rutas
       SET conductor_id = $1,
           vehiculo_id = $2,
           origen = $3,
           destino = $4,
           kilometros_programados = $5,
           metros_cubicos_enviados = $6,
           tipo_unidad = $7,
           fecha_registro = $8,
           fecha_entrega = $9,
           observaciones = $10,
           descripcion = $11,
           valor_monetario = $12,
           estatus = $13,
           updated_at = NOW()
       WHERE id = $14
         AND deleted_at IS NULL
       RETURNING id`,
      [
        routeData.conductor_id,
        routeData.vehiculo_id,
        routeData.origen,
        routeData.destino,
        routeData.kilometros_programados,
        routeData.metros_cubicos_enviados,
        routeData.tipo_unidad,
        routeData.fecha_registro,
        routeData.fecha_entrega,
        routeData.observaciones,
        routeData.descripcion,
        routeData.valor_monetario,
        routeData.estatus,
        routeId
      ]
    );

    if (!result.rows[0]) {
      return null;
    }

    return routeModel.getRouteById(routeId);
  },

  async deleteRoute(routeId) {
    const result = await query(
      `UPDATE rutas
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id`,
      [routeId]
    );

    return result.rows[0] || null;
  }
};
