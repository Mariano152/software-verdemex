import express from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { verifyToken } from '../middleware/auth.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', vehicleController.listGlobalMaintenanceRecords);
router.get('/:maintenanceId', vehicleController.getGlobalMaintenanceRecordById);
router.post('/', documentUploadMiddleware, vehicleController.createGlobalMaintenanceRecord);
router.put('/:maintenanceId', documentUploadMiddleware, vehicleController.updateGlobalMaintenanceRecord);
router.delete('/:maintenanceId', vehicleController.deleteGlobalMaintenanceRecord);
router.delete('/:maintenanceId/files/:fileId', vehicleController.deleteGlobalMaintenanceFile);
router.get('/:maintenanceId/download', vehicleController.downloadGlobalMaintenanceFile);

export default router;
