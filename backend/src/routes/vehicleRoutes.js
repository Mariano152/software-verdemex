import express from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { verifyToken } from '../middleware/auth.js';
import { photoUploadMiddleware } from '../middleware/photoUpload.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', photoUploadMiddleware, vehicleController.createVehicle);
router.put('/:id', photoUploadMiddleware, vehicleController.updateVehicle);

router.get('/', vehicleController.listVehicles);
router.get('/:id', vehicleController.getVehicleById);

router.get('/:vehicleId/safety-elements', vehicleController.getSafetyElements);
router.get('/:vehicleId/history', vehicleController.getVehicleHistory);
router.post('/:vehicleId/safety-elements', vehicleController.createSafetyElements);
router.put('/:vehicleId/safety-elements/:elementId', vehicleController.updateSafetyElement);
router.delete('/:vehicleId/safety-elements/:elementId', vehicleController.deleteSafetyElement);

router.get('/:vehicleId/maintenance-records/:maintenanceId', vehicleController.getMaintenanceRecordById);
router.post('/:vehicleId/maintenance-records', documentUploadMiddleware, vehicleController.createMaintenanceRecord);
router.put('/:vehicleId/maintenance-records/:maintenanceId', documentUploadMiddleware, vehicleController.updateMaintenanceRecord);
router.delete('/:vehicleId/maintenance-records/:maintenanceId', vehicleController.deleteMaintenanceRecord);
router.delete('/:vehicleId/maintenance-records/:maintenanceId/files/:fileId', vehicleController.deleteMaintenanceFile);
router.get('/:vehicleId/maintenance-records/:maintenanceId/download', vehicleController.downloadMaintenanceFile);

router.get('/:vehicleId/gasoline-records/:gasolineId', vehicleController.getGasolineRecordById);
router.post('/:vehicleId/gasoline-records', documentUploadMiddleware, vehicleController.createGasolineRecord);
router.put('/:vehicleId/gasoline-records/:gasolineId', documentUploadMiddleware, vehicleController.updateGasolineRecord);
router.delete('/:vehicleId/gasoline-records/:gasolineId', vehicleController.deleteGasolineRecord);
router.delete('/:vehicleId/gasoline-records/:gasolineId/files/:fileId', vehicleController.deleteGasolineFile);
router.get('/:vehicleId/gasoline-records/:gasolineId/download', vehicleController.downloadGasolineFile);

router.get('/:vehicleId/documents/:docId', vehicleController.getDocumentById);
router.post('/:vehicleId/documents', documentUploadMiddleware, vehicleController.createDocument);
router.put('/:vehicleId/documents/:docId', documentUploadMiddleware, vehicleController.updateDocument);
router.delete('/:vehicleId/documents/:docId', vehicleController.deleteDocument);
router.delete('/:vehicleId/documents/:docId/files/:fileId', vehicleController.deleteDocumentFile);
router.get('/:vehicleId/documents/:docId/download', vehicleController.downloadDocument);

export default router;
