import { auditLogModel } from '../models/auditLogModel.js';

export const auditLogController = {
  async list(req, res) {
    try {
      const [logs, users] = await Promise.all([auditLogModel.list(req.query), auditLogModel.users()]);
      res.json({ logs, users });
    } catch (error) {
      console.error('Error consultando auditoría:', error);
      res.status(500).json({ message: 'No se pudo consultar la bitácora', error: error.message });
    }
  }
};
