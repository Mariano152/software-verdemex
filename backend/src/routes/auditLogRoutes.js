import express from 'express';
import { auditLogController } from '../controllers/auditLogController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken, requirePermission('notifications.view'));
router.get('/', auditLogController.list);
export default router;
