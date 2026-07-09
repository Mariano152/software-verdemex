import express from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', vehicleController.listGlobalGasolineRecords);
router.post('/:gasolineId/signature', requireRole('conductor'), documentUploadMiddleware, vehicleController.submitGlobalGasolineSignature);
router.get('/:gasolineId/signature-download', vehicleController.downloadGlobalGasolineSignatureFile);
router.get('/:gasolineId', vehicleController.getGlobalGasolineRecordById);
router.post('/', documentUploadMiddleware, vehicleController.createGlobalGasolineRecord);
router.put('/:gasolineId', documentUploadMiddleware, vehicleController.updateGlobalGasolineRecord);
router.delete('/:gasolineId', vehicleController.deleteGlobalGasolineRecord);
router.delete('/:gasolineId/files/:fileId', vehicleController.deleteGlobalGasolineFile);
router.get('/:gasolineId/download', vehicleController.downloadGlobalGasolineFile);

export default router;
