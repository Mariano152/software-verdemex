import express from 'express';
import { salesController } from '../controllers/salesController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken, requirePermission('sales.view'));
router.get('/config', salesController.config);
router.get('/', salesController.list);

export default router;
