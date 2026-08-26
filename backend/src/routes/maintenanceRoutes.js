import express from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requirePermission('vehicles.maintenance', 'dashboard.view', 'analytics.view'), vehicleController.listGlobalMaintenanceRecords);
router.get('/:maintenanceId', requirePermission('vehicles.maintenance'), vehicleController.getGlobalMaintenanceRecordById);
router.post('/', requirePermission('vehicles.maintenance'), documentUploadMiddleware, vehicleController.createGlobalMaintenanceRecord);
router.put('/:maintenanceId', requirePermission('vehicles.maintenance'), documentUploadMiddleware, vehicleController.updateGlobalMaintenanceRecord);
router.delete('/:maintenanceId', requirePermission('vehicles.maintenance'), vehicleController.deleteGlobalMaintenanceRecord);
router.delete('/:maintenanceId/files/:fileId', requirePermission('vehicles.maintenance'), vehicleController.deleteGlobalMaintenanceFile);
router.get('/:maintenanceId/download', requirePermission('vehicles.maintenance'), vehicleController.downloadGlobalMaintenanceFile);

export default router;
