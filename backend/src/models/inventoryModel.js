import pool, { query } from '../config/database.js';

const buildRecordDocumentMetadata = (record) => {
  if (!record?.documento_nombre_original) return null;

  return {
    nombre_original: record.documento_nombre_original,
    tipo_mime: record.documento_tipo_mime || null,
    tamano_bytes: record.documento_tamano_bytes || null,
    download_url: `/api/inventory/records/${record.id}/download`
  };
};

const normalizeDateString = (value) => {
  if (!value) return null;

  const directMatch = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) return directMatch[1];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BASE_RECORD_SELECT = `
  SELECT
    r.id,
    r.pipa_id,
    r.fecha,
    r.lugar,
    r.litros_iniciales,
    r.litros_finales,
    r.litros_comprados,
    r.costo_total_compra,
    r.nombre_pipa_snapshot,
    r.tipo_combustible_snapshot,
    r.capacidad_maxima_snapshot,
    r.observaciones,
    r.created_at,
    r.updated_at,
    p.nombre AS pipa_nombre_actual,
    p.tipo_combustible AS pipa_tipo_combustible_actual,
    p.capacidad_maxima_litros AS pipa_capacidad_actual
`;

const EXTENDED_RECORD_SELECT = `
  SELECT
    r.id,
    r.pipa_id,
    r.fecha,
    r.lugar,
    r.litros_iniciales,
    r.litros_finales,
    r.litros_comprados,
    r.costo_total_compra,
    r.nombre_pipa_snapshot,
    r.tipo_combustible_snapshot,
    r.capacidad_maxima_snapshot,
    r.factura,
    r.proveedor,
    r.documento_nombre_original,
    r.documento_tipo_mime,
    r.documento_tamano_bytes,
    r.observaciones,
    r.created_at,
    r.updated_at,
    CASE
      WHEN COALESCE(r.litros_comprados, 0) > 0
      THEN ROUND((COALESCE(r.costo_total_compra, 0) / r.litros_comprados)::numeric, 4)
      ELSE 0
    END AS costo_unitario,
    COALESCE(consumed.litros_consumidos, 0) AS litros_consumidos,
    GREATEST(COALESCE(r.litros_comprados, 0) - COALESCE(consumed.litros_consumidos, 0), 0) AS litros_disponibles,
    p.nombre AS pipa_nombre_actual,
    p.tipo_combustible AS pipa_tipo_combustible_actual,
    p.capacidad_maxima_litros AS pipa_capacidad_actual
`;

const buildPipaSelect = () => `
  SELECT
    p.*,
    COALESCE(stock.litros_disponibles, 0) AS litros_actuales,
    latest.fecha AS ultima_fecha_registro,
    latest.lugar AS ultimo_lugar_registro,
    COALESCE(stats.total_registros, 0) AS total_registros,
    COALESCE(stats.total_inversion, 0) AS total_inversion
  FROM inventario_pipas p
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(GREATEST(COALESCE(r.litros_comprados, 0) - COALESCE(consumed.litros_consumidos, 0), 0)), 0) AS litros_disponibles
    FROM inventario_pipa_registros r
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(c.litros_consumidos), 0) AS litros_consumidos
      FROM inventario_pipa_consumos c
      WHERE c.inventario_pipa_registro_id = r.id
        AND c.deleted_at IS NULL
    ) consumed ON true
    WHERE r.pipa_id = p.id
      AND r.deleted_at IS NULL
  ) stock ON true
  LEFT JOIN LATERAL (
    SELECT
      r.fecha,
      r.lugar,
      r.litros_finales
    FROM inventario_pipa_registros r
    WHERE r.pipa_id = p.id
      AND r.deleted_at IS NULL
    ORDER BY r.fecha DESC, r.created_at DESC
    LIMIT 1
  ) latest ON true
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_registros,
      COALESCE(SUM(r.costo_total_compra), 0) AS total_inversion
    FROM inventario_pipa_registros r
    WHERE r.pipa_id = p.id
      AND r.deleted_at IS NULL
  ) stats ON true
`;

export const inventoryModel = {
  async getAllPipas(filters = {}) {
    const params = [];
    const conditions = ['p.deleted_at IS NULL'];

    if (filters.search) {
      params.push(`%${String(filters.search).trim()}%`);
      conditions.push(`(
        p.nombre ILIKE $${params.length}
        OR COALESCE(p.observaciones, '') ILIKE $${params.length}
      )`);
    }

    if (filters.fuelType) {
      params.push(filters.fuelType);
      conditions.push(`p.tipo_combustible = $${params.length}`);
    }

    const result = await query(
      `${buildPipaSelect()}
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.nombre ASC, p.created_at ASC`,
      params
    );

    return result.rows;
  },

  async getPipaById(pipaId) {
    const result = await query(
      `${buildPipaSelect()}
       WHERE p.id = $1
         AND p.deleted_at IS NULL
       LIMIT 1`,
      [pipaId]
    );

    return result.rows[0] || null;
  },

  async getPipaConsumptionHistory(pipaId) {
    const result = await query(
      `SELECT
         c.id,
         c.fecha_consumo,
         c.litros_consumidos,
         c.costo_unitario,
         c.costo_total,
         c.created_at,
         g.id AS gasolina_registro_id,
         g.fecha_carga,
         g.hora_carga,
         g.factura AS gasolina_factura,
         g.titulo AS gasolina_titulo,
         g.proveedor AS gasolina_proveedor,
         g.operador,
         g.kilometraje_actual,
         g.kilometraje_anterior,
         g.kilometros_recorridos,
         g.m3_enviados,
         v.id AS vehiculo_id,
         COALESCE(g.numero_economico_snapshot, v.numero_economico) AS vehiculo_numero_economico,
         COALESCE(g.placa_snapshot, v.placa) AS vehiculo_placa,
         COALESCE(g.descripcion_snapshot, v.descripcion, v.propietario_nombre) AS vehiculo_descripcion,
         r.id AS inventario_registro_id,
         r.fecha AS lote_fecha,
         r.factura AS lote_factura,
         r.proveedor AS lote_proveedor,
         r.lugar AS lote_lugar
       FROM inventario_pipa_consumos c
       JOIN vehiculo_gasolina_registros g
         ON g.id = c.vehiculo_gasolina_registro_id
        AND g.deleted_at IS NULL
       JOIN vehiculos v
         ON v.id = g.vehiculo_id
        AND v.deleted_at IS NULL
       JOIN inventario_pipa_registros r
         ON r.id = c.inventario_pipa_registro_id
        AND r.deleted_at IS NULL
       WHERE c.pipa_id = $1
         AND c.deleted_at IS NULL
       ORDER BY c.fecha_consumo DESC, g.hora_carga DESC NULLS LAST, c.created_at DESC`,
      [pipaId]
    );

    return result.rows;
  },

  async createPipa(pipaData) {
    const {
      nombre,
      tipo_combustible,
      capacidad_maxima_litros,
      observaciones
    } = pipaData;

    const result = await query(
      `INSERT INTO inventario_pipas (
         nombre,
         tipo_combustible,
         capacidad_maxima_litros,
         observaciones
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        nombre,
        tipo_combustible,
        capacidad_maxima_litros,
        observaciones
      ]
    );

    return result.rows[0] || null;
  },

  async updatePipa(pipaId, pipaData) {
    const {
      nombre,
      tipo_combustible,
      capacidad_maxima_litros,
      observaciones
    } = pipaData;

    const result = await query(
      `UPDATE inventario_pipas
       SET nombre = $1,
           tipo_combustible = $2,
           capacidad_maxima_litros = $3,
           observaciones = $4,
           updated_at = NOW()
       WHERE id = $5
         AND deleted_at IS NULL
       RETURNING *`,
      [
        nombre,
        tipo_combustible,
        capacidad_maxima_litros,
        observaciones,
        pipaId
      ]
    );

    return result.rows[0] || null;
  },

  async deletePipa(pipaId) {
    const result = await query(
      `UPDATE inventario_pipas
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING *`,
      [pipaId]
    );

    if (!result.rows[0]) return null;

    await query(
      `UPDATE inventario_pipa_registros
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE pipa_id = $1
         AND deleted_at IS NULL`,
      [pipaId]
    );

    await query(
      `UPDATE inventario_pipa_consumos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE pipa_id = $1
         AND deleted_at IS NULL`,
      [pipaId]
    );

    return result.rows[0];
  },

  async getAllRecords(filters = {}) {
    const params = [];
    const conditions = [
      'r.deleted_at IS NULL',
      'p.deleted_at IS NULL'
    ];

    if (filters.pipaId) {
      params.push(filters.pipaId);
      conditions.push(`r.pipa_id = $${params.length}`);
    }

    if (filters.fuelType) {
      params.push(filters.fuelType);
      conditions.push(`r.tipo_combustible_snapshot = $${params.length}`);
    }

    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      conditions.push(`r.fecha >= $${params.length}`);
    }

    if (filters.dateTo) {
      params.push(filters.dateTo);
      conditions.push(`r.fecha <= $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${String(filters.search).trim()}%`);
      conditions.push(`(
        r.nombre_pipa_snapshot ILIKE $${params.length}
        OR r.tipo_combustible_snapshot ILIKE $${params.length}
        OR COALESCE(r.factura, '') ILIKE $${params.length}
        OR COALESCE(r.proveedor, '') ILIKE $${params.length}
        OR COALESCE(r.lugar, '') ILIKE $${params.length}
        OR COALESCE(r.observaciones, '') ILIKE $${params.length}
      )`);
    }

    try {
      const result = await query(
        `${EXTENDED_RECORD_SELECT}
         FROM inventario_pipa_registros r
         JOIN inventario_pipas p ON p.id = r.pipa_id
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(c.litros_consumidos), 0) AS litros_consumidos
           FROM inventario_pipa_consumos c
           WHERE c.inventario_pipa_registro_id = r.id
             AND c.deleted_at IS NULL
         ) consumed ON true
         WHERE ${conditions.join(' AND ')}
         ORDER BY r.fecha DESC, r.created_at DESC`,
        params
      );

      return result.rows.map((row) => ({
        ...row,
        documento: buildRecordDocumentMetadata(row)
      }));
    } catch (error) {
      if (error.code !== '42703') throw error;

      const fallbackResult = await query(
        `${BASE_RECORD_SELECT}
         FROM inventario_pipa_registros r
         JOIN inventario_pipas p ON p.id = r.pipa_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY r.fecha DESC, r.created_at DESC`,
        params
      );

      return fallbackResult.rows.map((row) => ({
        ...row,
        factura: null,
        proveedor: null,
        documento: null
      }));
    }
  },

  async getRecordById(recordId) {
    try {
      const result = await query(
        `${EXTENDED_RECORD_SELECT}
         FROM inventario_pipa_registros r
         JOIN inventario_pipas p ON p.id = r.pipa_id
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(c.litros_consumidos), 0) AS litros_consumidos
           FROM inventario_pipa_consumos c
           WHERE c.inventario_pipa_registro_id = r.id
             AND c.deleted_at IS NULL
         ) consumed ON true
         WHERE r.id = $1
           AND r.deleted_at IS NULL
           AND p.deleted_at IS NULL
         LIMIT 1`,
        [recordId]
      );

      const row = result.rows[0] || null;
      if (!row) return null;

      return {
        ...row,
        documento: buildRecordDocumentMetadata(row)
      };
    } catch (error) {
      if (error.code !== '42703') throw error;

      const fallbackResult = await query(
        `${BASE_RECORD_SELECT}
         FROM inventario_pipa_registros r
         JOIN inventario_pipas p ON p.id = r.pipa_id
         WHERE r.id = $1
           AND r.deleted_at IS NULL
           AND p.deleted_at IS NULL
         LIMIT 1`,
        [recordId]
      );

      const row = fallbackResult.rows[0] || null;
      if (!row) return null;

      return {
        ...row,
        factura: null,
        proveedor: null,
        documento: null
      };
    }
  },

  async getLatestRecordByPipaId(pipaId, options = {}) {
    const params = [pipaId];
    const conditions = [
      'pipa_id = $1',
      'deleted_at IS NULL'
    ];

    if (options.excludeRecordId) {
      params.push(options.excludeRecordId);
      conditions.push(`id <> $${params.length}`);
    }

    if (options.fecha) {
      params.push(options.fecha);
      conditions.push(`fecha <= $${params.length}`);
    }

    const result = await query(
      `SELECT *
       FROM inventario_pipa_registros
       WHERE ${conditions.join(' AND ')}
       ORDER BY fecha DESC, created_at DESC
       LIMIT 1`,
      params
    );

    return result.rows[0] || null;
  },

  async createRecord(recordData) {
    const {
      pipa_id,
      fecha,
      lugar,
      litros_iniciales,
      litros_finales,
      litros_comprados,
      costo_total_compra,
      nombre_pipa_snapshot,
      tipo_combustible_snapshot,
      capacidad_maxima_snapshot,
      factura,
      proveedor,
      documento_nombre_original,
      documento_tipo_mime,
      documento_tamano_bytes,
      documento_data,
      observaciones
    } = recordData;

    const result = await query(
      `INSERT INTO inventario_pipa_registros (
         pipa_id,
         fecha,
         lugar,
         litros_iniciales,
         litros_finales,
         litros_comprados,
         costo_total_compra,
         nombre_pipa_snapshot,
         tipo_combustible_snapshot,
         capacidad_maxima_snapshot,
         factura,
         proveedor,
         documento_nombre_original,
         documento_tipo_mime,
         documento_tamano_bytes,
         documento_data,
         observaciones
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        pipa_id,
        fecha,
        lugar,
        litros_iniciales,
        litros_finales,
        litros_comprados,
        costo_total_compra,
        nombre_pipa_snapshot,
        tipo_combustible_snapshot,
        capacidad_maxima_snapshot,
        factura,
        proveedor,
        documento_nombre_original,
        documento_tipo_mime,
        documento_tamano_bytes,
        documento_data,
        observaciones
      ]
    );

    return result.rows[0] || null;
  },

  async updateRecord(recordId, recordData, options = {}) {
    const {
      pipa_id,
      fecha,
      lugar,
      litros_iniciales,
      litros_finales,
      litros_comprados,
      costo_total_compra,
      nombre_pipa_snapshot,
      tipo_combustible_snapshot,
      capacidad_maxima_snapshot,
      factura,
      proveedor,
      documento_nombre_original,
      documento_tipo_mime,
      documento_tamano_bytes,
      documento_data,
      observaciones
    } = recordData;

    const db = options.client || { query };
    const result = await db.query(
      `UPDATE inventario_pipa_registros
       SET pipa_id = $1,
           fecha = $2,
           lugar = $3,
           litros_iniciales = $4,
           litros_finales = $5,
           litros_comprados = $6,
           costo_total_compra = $7,
           nombre_pipa_snapshot = $8,
           tipo_combustible_snapshot = $9,
           capacidad_maxima_snapshot = $10,
           factura = $11,
           proveedor = $12,
           documento_nombre_original = $13,
           documento_tipo_mime = $14,
           documento_tamano_bytes = $15,
           documento_data = COALESCE($16, documento_data),
           observaciones = $17,
           updated_at = NOW()
       WHERE id = $18
         AND deleted_at IS NULL
       RETURNING *`,
      [
        pipa_id,
        fecha,
        lugar,
        litros_iniciales,
        litros_finales,
        litros_comprados,
        costo_total_compra,
        nombre_pipa_snapshot,
        tipo_combustible_snapshot,
        capacidad_maxima_snapshot,
        factura,
        proveedor,
        documento_nombre_original,
        documento_tipo_mime,
        documento_tamano_bytes,
        documento_data,
        observaciones,
        recordId
      ]
    );

    return result.rows[0] || null;
  },

  async updateRecordAndRebalance(recordId, recordData, existingRecord) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const updatedRecord = await this.updateRecord(recordId, recordData, { client });

      if (updatedRecord) {
        const affectedPipas = new Map();
        const previousDate = normalizeDateString(existingRecord?.fecha) || normalizeDateString(recordData.fecha);
        const nextDate = normalizeDateString(recordData.fecha) || previousDate;
        const fromDate = previousDate && nextDate && previousDate < nextDate ? previousDate : nextDate;

        if (existingRecord?.pipa_id) {
          affectedPipas.set(String(existingRecord.pipa_id), fromDate);
        }
        if (recordData.pipa_id) {
          affectedPipas.set(String(recordData.pipa_id), fromDate);
        }

        for (const [pipaId, rebalanceDate] of affectedPipas.entries()) {
          await this.rebalancePipaFifoFrom({
            pipaId,
            fromDate: rebalanceDate,
            client
          });
        }
      }

      await client.query('COMMIT');
      return updatedRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteRecord(recordId) {
    const result = await query(
      `UPDATE inventario_pipa_registros
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING *`,
      [recordId]
    );

    if (result.rows[0]) {
      await query(
        `UPDATE inventario_pipa_consumos
         SET deleted_at = NOW(),
             updated_at = NOW()
         WHERE inventario_pipa_registro_id = $1
           AND deleted_at IS NULL`,
        [recordId]
      );
    }

    return result.rows[0] || null;
  },

  async calculatePipaFifoCost({ pipaId, litros, fecha, excludeGasolineId = null, client = null }) {
    const requestedLiters = Number(litros || 0);
    if (!pipaId || requestedLiters <= 0) {
      throw new Error('Los litros de la carga desde pipa deben ser mayores a 0');
    }

    const db = client || { query };
    const result = await db.query(
      `SELECT
         r.id,
         r.fecha,
         r.proveedor,
         r.litros_comprados,
         r.costo_total_compra,
         CASE
           WHEN COALESCE(r.litros_comprados, 0) > 0
           THEN ROUND((COALESCE(r.costo_total_compra, 0) / r.litros_comprados)::numeric, 4)
           ELSE 0
         END AS costo_unitario,
         COALESCE(consumed.litros_consumidos, 0) AS litros_consumidos,
         GREATEST(COALESCE(r.litros_comprados, 0) - COALESCE(consumed.litros_consumidos, 0), 0) AS litros_disponibles
       FROM inventario_pipa_registros r
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(c.litros_consumidos), 0) AS litros_consumidos
         FROM inventario_pipa_consumos c
         WHERE c.inventario_pipa_registro_id = r.id
           AND c.deleted_at IS NULL
           AND ($3::uuid IS NULL OR c.vehiculo_gasolina_registro_id <> $3::uuid)
       ) consumed ON true
       WHERE r.pipa_id = $1
         AND r.deleted_at IS NULL
         AND ($2::date IS NULL OR r.fecha <= $2::date)
         AND COALESCE(r.litros_comprados, 0) > 0
       ORDER BY r.fecha ASC, r.created_at ASC`,
      [pipaId, fecha || null, excludeGasolineId || null]
    );

    let remainingLiters = requestedLiters;
    const allocations = [];

    for (const row of result.rows) {
      if (remainingLiters <= 0) break;

      const availableLiters = Number(row.litros_disponibles || 0);
      if (availableLiters <= 0) continue;

      const consumedLiters = Math.min(availableLiters, remainingLiters);
      const unitCost = Number(row.costo_unitario || 0);
      allocations.push({
        inventario_pipa_registro_id: row.id,
        litros_consumidos: Number(consumedLiters.toFixed(2)),
        costo_unitario: Number(unitCost.toFixed(4)),
        costo_total: Number((consumedLiters * unitCost).toFixed(2)),
        proveedor: row.proveedor || null
      });
      remainingLiters = Number((remainingLiters - consumedLiters).toFixed(2));
    }

    if (remainingLiters > 0) {
      const available = Number((requestedLiters - remainingLiters).toFixed(2));
      throw new Error(`La pipa seleccionada no tiene litros suficientes para esta carga. Disponibles: ${available.toLocaleString('es-MX')} L`);
    }

    const totalCost = Number(allocations.reduce((sum, item) => sum + item.costo_total, 0).toFixed(2));
    const averageUnitCost = Number((totalCost / requestedLiters).toFixed(4));

    return {
      allocations,
      costo_total: totalCost,
      precio_litro_referencia: averageUnitCost,
      inventario_pipa_registro_id: allocations[0]?.inventario_pipa_registro_id || null,
      proveedor: allocations[0]?.proveedor || null
    };
  },

  async replacePipaFifoConsumption({ gasolineId, pipaId, fecha, allocations = [], client = null }) {
    const ownedClient = client || await pool.connect();

    try {
      if (!client) await ownedClient.query('BEGIN');
      await ownedClient.query(
        `UPDATE inventario_pipa_consumos
         SET deleted_at = NOW(),
             updated_at = NOW()
         WHERE vehiculo_gasolina_registro_id = $1
           AND deleted_at IS NULL`,
        [gasolineId]
      );

      for (const allocation of allocations) {
        await ownedClient.query(
          `INSERT INTO inventario_pipa_consumos (
             pipa_id,
             inventario_pipa_registro_id,
             vehiculo_gasolina_registro_id,
             fecha_consumo,
             litros_consumidos,
             costo_unitario,
             costo_total
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            pipaId,
            allocation.inventario_pipa_registro_id,
            gasolineId,
            fecha,
            allocation.litros_consumidos,
            allocation.costo_unitario,
            allocation.costo_total
          ]
        );
      }

      if (!client) await ownedClient.query('COMMIT');
    } catch (error) {
      if (!client) await ownedClient.query('ROLLBACK');
      throw error;
    } finally {
      if (!client) ownedClient.release();
    }
  },

  async clearPipaFifoConsumption(gasolineId) {
    await query(
      `UPDATE inventario_pipa_consumos
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE vehiculo_gasolina_registro_id = $1
         AND deleted_at IS NULL`,
      [gasolineId]
    );
  },

  async rebalancePipaFifoFrom({ pipaId, fromDate, client = null }) {
    if (!pipaId || !fromDate) return { rebalanced: 0 };

    const ownedClient = client || await pool.connect();

    try {
      if (!client) await ownedClient.query('BEGIN');

      const pipaResult = await ownedClient.query(
        `SELECT nombre
         FROM inventario_pipas
         WHERE id = $1
           AND deleted_at IS NULL
         LIMIT 1`,
        [pipaId]
      );
      const pipaName = pipaResult.rows[0]?.nombre || null;

      const affectedResult = await ownedClient.query(
        `SELECT
           affected.id,
           affected.fecha_carga,
           affected.hora_carga,
           affected.litros
         FROM (
           SELECT DISTINCT ON (g.id)
             g.id,
             g.fecha_carga,
             g.hora_carga,
             g.litros,
             COALESCE(g.hora_carga, TIME '00:00:00') AS hora_orden
           FROM vehiculo_gasolina_registros g
           LEFT JOIN inventario_pipa_consumos c
             ON c.vehiculo_gasolina_registro_id = g.id
            AND c.deleted_at IS NULL
           LEFT JOIN inventario_pipa_registros linked_record
             ON linked_record.id = g.inventario_pipa_registro_id
            AND linked_record.deleted_at IS NULL
           WHERE g.deleted_at IS NULL
             AND g.origen_carga = 'pipa'
             AND g.fecha_carga >= $2::date
             AND (
               c.pipa_id = $1
               OR linked_record.pipa_id = $1
             )
           ORDER BY g.id, g.fecha_carga ASC, COALESCE(g.hora_carga, TIME '00:00:00') ASC
         ) affected
         ORDER BY affected.fecha_carga ASC, affected.hora_orden ASC, affected.id ASC`,
        [pipaId, fromDate]
      );

      const affectedRecords = affectedResult.rows;
      if (affectedRecords.length === 0) {
        if (!client) await ownedClient.query('COMMIT');
        return { rebalanced: 0 };
      }

      await ownedClient.query(
        `UPDATE inventario_pipa_consumos
         SET deleted_at = NOW(),
             updated_at = NOW()
         WHERE deleted_at IS NULL
           AND vehiculo_gasolina_registro_id = ANY($1::uuid[])`,
        [affectedRecords.map((record) => record.id)]
      );

      for (const record of affectedRecords) {
        const fifoPricing = await this.calculatePipaFifoCost({
          pipaId,
          litros: record.litros,
          fecha: record.fecha_carga,
          excludeGasolineId: record.id,
          client: ownedClient
        });

        await ownedClient.query(
          `UPDATE vehiculo_gasolina_registros
           SET costo_total = $1,
               inventario_pipa_registro_id = $2,
               pipa_nombre_snapshot = COALESCE($3, pipa_nombre_snapshot),
               precio_litro_referencia = $4,
               updated_at = NOW()
           WHERE id = $5
             AND deleted_at IS NULL`,
          [
            fifoPricing.costo_total,
            fifoPricing.inventario_pipa_registro_id,
            pipaName,
            fifoPricing.precio_litro_referencia,
            record.id
          ]
        );

        await this.replacePipaFifoConsumption({
          gasolineId: record.id,
          pipaId,
          fecha: record.fecha_carga,
          allocations: fifoPricing.allocations,
          client: ownedClient
        });
      }

      if (!client) await ownedClient.query('COMMIT');
      return { rebalanced: affectedRecords.length };
    } catch (error) {
      if (!client) await ownedClient.query('ROLLBACK');
      throw error;
    } finally {
      if (!client) ownedClient.release();
    }
  },

  async getRecordDocument(recordId) {
    const result = await query(
      `SELECT
         id,
         documento_nombre_original,
         documento_tipo_mime,
         documento_tamano_bytes,
         documento_data
       FROM inventario_pipa_registros
       WHERE id = $1
         AND deleted_at IS NULL
         AND documento_data IS NOT NULL
       LIMIT 1`,
      [recordId]
    );

    return result.rows[0] || null;
  }
};
