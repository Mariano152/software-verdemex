import { query } from '../config/database.js';

export const auditLogModel = {
  async create(entry) {
    await query(
      `INSERT INTO audit_logs (user_id, user_email, username, user_name, module, action, entity_type, entity_id, title, method, path, status_code, request_data, response_data, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16)`,
      [entry.userId, entry.userEmail, entry.username, entry.userName, entry.module, entry.action, entry.entityType, entry.entityId, entry.title, entry.method, entry.path, entry.statusCode, JSON.stringify(entry.requestData || {}), JSON.stringify(entry.responseData || {}), entry.ipAddress, entry.userAgent]
    );
  },

  async list(filters) {
    const conditions = [];
    const values = [];
    const add = (sql, value) => { values.push(value); conditions.push(sql.replace('?', `$${values.length}`)); };
    if (filters.module && filters.module !== 'todos') add('module = ?', filters.module);
    if (filters.action && filters.action !== 'todos') add('action = ?', filters.action);
    if (filters.userId === 'deleted') conditions.push('user_id IS NULL');
    else if (filters.userId && filters.userId !== 'todos') add('user_id = ?', filters.userId);
    if (filters.dateFrom) add('created_at >= ?::date', filters.dateFrom);
    if (filters.dateTo) add("created_at < (?::date + INTERVAL '1 day')", filters.dateTo);
    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(title ILIKE $${values.length} OR user_name ILIKE $${values.length} OR username ILIKE $${values.length} OR path ILIKE $${values.length})`);
    }
    values.push(Math.min(Math.max(Number(filters.limit) || 200, 1), 1000));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC, id DESC LIMIT $${values.length}`, values);
    return result.rows;
  },

  async users() {
    const result = await query(`SELECT DISTINCT user_id AS id, COALESCE(user_name, username, user_email, 'Cuenta eliminada') AS name FROM audit_logs ORDER BY name`);
    return result.rows;
  }
};
