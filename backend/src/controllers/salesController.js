import { odooService } from '../services/odooService.js';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const salesController = {
  async config(req, res, next) {
    try {
      res.json(odooService.getPublicConfig());
    } catch (error) { next(error); }
  },

  async list(req, res, next) {
    try {
      const from = isoDate.test(String(req.query.from || '')) ? req.query.from : null;
      const to = isoDate.test(String(req.query.to || '')) ? req.query.to : null;
      if (from && to && from > to) return res.status(400).json({ error: 'La fecha inicial debe ser anterior a la final' });
      const states = String(req.query.states || '').split(',').filter(Boolean);
      const data = await odooService.getSales({ from, to, states, includeLines: req.query.includeLines !== 'false' });
      res.json(data);
    } catch (error) {
      if (error.code === 'ODOO_NOT_CONFIGURED') {
        return res.status(503).json({ error: error.message, code: error.code, config: odooService.getPublicConfig() });
      }
      next(error);
    }
  }
};
