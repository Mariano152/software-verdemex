import express from 'express';
import { routeController } from '../controllers/routeController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requirePermission('routes.view', 'dashboard.view', 'analytics.view'), routeController.listRoutes);
router.get('/:id', requirePermission('routes.view'), routeController.getRouteById);
router.post('/', requirePermission('routes.manage'), routeController.createRoute);
router.put('/:id', requirePermission('routes.manage'), routeController.updateRoute);
router.delete('/:id', requirePermission('routes.manage'), routeController.deleteRoute);

export default router;
