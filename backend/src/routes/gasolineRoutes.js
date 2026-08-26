import express from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { requirePermission, requireRole, verifyToken } from '../middleware/auth.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requirePermission('gasoline.view', 'dashboard.view', 'analytics.view'), vehicleController.listGlobalGasolineRecords);
router.post('/:gasolineId/signature', requireRole('conductor'), documentUploadMiddleware, vehicleController.submitGlobalGasolineSignature);
router.get('/:gasolineId/signature-download', requirePermission('gasoline.view'), vehicleController.downloadGlobalGasolineSignatureFile);
router.get('/:gasolineId', requirePermission('gasoline.view'), vehicleController.getGlobalGasolineRecordById);
router.post('/', requirePermission('gasoline.manage'), documentUploadMiddleware, vehicleController.createGlobalGasolineRecord);
router.put('/:gasolineId', requirePermission('gasoline.manage'), documentUploadMiddleware, vehicleController.updateGlobalGasolineRecord);
router.delete('/:gasolineId', requirePermission('gasoline.manage'), vehicleController.deleteGlobalGasolineRecord);
router.delete('/:gasolineId/files/:fileId', requirePermission('gasoline.manage'), vehicleController.deleteGlobalGasolineFile);
router.get('/:gasolineId/download', requirePermission('gasoline.view'), vehicleController.downloadGlobalGasolineFile);

export default router;
