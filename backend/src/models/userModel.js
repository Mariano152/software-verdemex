import { query } from '../config/database.js';

export const userModel = {
  async findByIdentifier(identifier) {
    const result = await query(
      `SELECT id, email, username, first_name, last_name, password, role, driver_id, permissions, created_at
       FROM users
       WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1))
         AND deleted_at IS NULL`,
      [identifier]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await query(
      `SELECT id, email, username, first_name, last_name, password, role, driver_id, permissions, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
         AND deleted_at IS NULL`,
      [email]
    );
    return result.rows[0];
  },

  async findByUsername(username) {
    const result = await query(
      `SELECT id, email, username, first_name, last_name, password, role, driver_id, permissions, created_at
       FROM users
       WHERE LOWER(username) = LOWER($1)
         AND deleted_at IS NULL`,
      [username]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      `SELECT
         u.id,
         u.email,
         u.username,
         u.first_name,
         u.last_name,
         u.role,
         u.driver_id,
         u.permissions,
         u.created_at,
         u.updated_at,
         d.nombre AS driver_name
       FROM users u
       LEFT JOIN conductores d
         ON d.id = u.driver_id
        AND d.deleted_at IS NULL
       WHERE u.id = $1
         AND u.deleted_at IS NULL`,
      [id]
    );
    return result.rows[0];
  },

  async listUsers() {
    const result = await query(
      `SELECT
         u.id,
         u.email,
         u.username,
         u.first_name,
         u.last_name,
         u.role,
         u.driver_id,
         u.permissions,
         u.created_at,
         u.updated_at,
         d.nombre AS driver_name
       FROM users u
       LEFT JOIN conductores d
         ON d.id = u.driver_id
        AND d.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC, u.id DESC`
    );
    return result.rows;
  },

  async create({ email, username, firstName, lastName, hashedPassword, role, driverId = null, permissions = [] }) {
    const result = await query(
      `INSERT INTO users (email, username, first_name, last_name, password, role, driver_id, permissions, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
       RETURNING id, email, username, first_name, last_name, role, driver_id, permissions, created_at`,
      [email, username, firstName, lastName, hashedPassword, role, driverId, JSON.stringify(permissions)]
    );
    return result.rows[0];
  },

  async update(userId, { email, username, firstName, lastName, role, driverId = null, hashedPassword = null, permissions = [] }) {
    const result = await query(
      `UPDATE users
       SET email = $1,
           username = $2,
           first_name = $3,
           last_name = $4,
           role = $5,
           driver_id = $6,
           password = COALESCE($7, password),
           permissions = $8::jsonb,
           updated_at = NOW()
       WHERE id = $9
         AND deleted_at IS NULL
       RETURNING id, email, username, first_name, last_name, role, driver_id, permissions, created_at, updated_at`,
      [email, username, firstName, lastName, role, driverId, hashedPassword, JSON.stringify(permissions), userId]
    );
    return result.rows[0] || null;
  },

  async emailExists(email, excludeId = null) {
    const params = [email];
    let sql = 'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL';

    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id <> $${params.length}`;
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  },

  async usernameExists(username, excludeId = null) {
    const params = [username];
    let sql = 'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL';

    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id <> $${params.length}`;
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  },

  async driverUserExists(driverId, excludeId = null) {
    const params = [driverId];
    let sql = 'SELECT id FROM users WHERE driver_id = $1 AND deleted_at IS NULL';

    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id <> $${params.length}`;
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  },

  async updateLastLogin(userId) {
    await query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [userId]
    );
  },

  async softDelete(userId) {
    await query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1',
      [userId]
    );
  }
};
