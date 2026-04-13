import { query } from '../config/database.js';

export const userModel = {
  // Obtener usuario por email
  async findByEmail(email) {
    const result = await query(
      'SELECT id, email, first_name, last_name, password, created_at FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows[0];
  },

  // Obtener usuario por ID
  async findById(id) {
    const result = await query(
      'SELECT id, email, first_name, last_name, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0];
  },

  // Crear nuevo usuario
  async create(email, firstName, lastName, hashedPassword) {
    const result = await query(
      `INSERT INTO users (email, first_name, last_name, password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, first_name, last_name, created_at`,
      [email, firstName, lastName, hashedPassword]
    );
    return result.rows[0];
  },

  // Verificar si email existe
  async emailExists(email) {
    const result = await query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows.length > 0;
  },

  // Actualizar último login
  async updateLastLogin(userId) {
    await query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [userId]
    );
  },

  // Soft delete (logout/inactividad)
  async softDelete(userId) {
    await query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1',
      [userId]
    );
  }
};
