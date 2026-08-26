import express from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';
import { photoUploadMiddleware } from '../middleware/photoUpload.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', requirePermission('vehicles.create'), photoUploadMiddleware, vehicleController.createVehicle);
router.delete('/:id', requirePermission('vehicles.delete'), vehicleController.deleteVehicle);
router.put('/:id', requirePermission('vehicles.edit', 'vehicles.photos', 'vehicles.documents', 'vehicles.maintenance'), photoUploadMiddleware, vehicleController.updateVehicle);

router.get('/', requirePermission('vehicles.view', 'dashboard.view', 'analytics.view'), vehicleController.listVehicles);
router.get('/:id', requirePermission('vehicles.view'), vehicleController.getVehicleById);

router.get('/:vehicleId/safety-elements', requirePermission('vehicles.view'), vehicleController.getSafetyElements);
router.get('/:vehicleId/parameters', requirePermission('vehicles.view'), vehicleController.getVehicleParameters);
router.put('/:vehicleId/parameters', requirePermission('vehicles.parameters'), vehicleController.upsertVehicleParameters);
router.get('/:vehicleId/history', requirePermission('vehicles.view'), vehicleController.getVehicleHistory);
router.post('/:vehicleId/safety-elements', requirePermission('vehicles.maintenance'), vehicleController.createSafetyElements);
router.put('/:vehicleId/safety-elements/:elementId', requirePermission('vehicles.maintenance'), vehicleController.updateSafetyElement);
router.delete('/:vehicleId/safety-elements/:elementId', requirePermission('vehicles.maintenance'), vehicleController.deleteSafetyElement);

router.get('/:vehicleId/maintenance-records/:maintenanceId', requirePermission('vehicles.view', 'vehicles.maintenance'), vehicleController.getMaintenanceRecordById);
router.post('/:vehicleId/maintenance-records', requirePermission('vehicles.maintenance'), documentUploadMiddleware, vehicleController.createMaintenanceRecord);
router.put('/:vehicleId/maintenance-records/:maintenanceId', requirePermission('vehicles.maintenance'), documentUploadMiddleware, vehicleController.updateMaintenanceRecord);
router.delete('/:vehicleId/maintenance-records/:maintenanceId', requirePermission('vehicles.maintenance'), vehicleController.deleteMaintenanceRecord);
router.delete('/:vehicleId/maintenance-records/:maintenanceId/files/:fileId', requirePermission('vehicles.maintenance'), vehicleController.deleteMaintenanceFile);
router.get('/:vehicleId/maintenance-records/:maintenanceId/download', requirePermission('vehicles.view', 'vehicles.maintenance'), vehicleController.downloadMaintenanceFile);

router.get('/:vehicleId/gasoline-records/:gasolineId', requirePermission('gasoline.view'), vehicleController.getGasolineRecordById);
router.post('/:vehicleId/gasoline-records', requirePermission('gasoline.manage'), documentUploadMiddleware, vehicleController.createGasolineRecord);
router.put('/:vehicleId/gasoline-records/:gasolineId', requirePermission('gasoline.manage'), documentUploadMiddleware, vehicleController.updateGasolineRecord);
router.delete('/:vehicleId/gasoline-records/:gasolineId', requirePermission('gasoline.manage'), vehicleController.deleteGasolineRecord);
router.delete('/:vehicleId/gasoline-records/:gasolineId/files/:fileId', requirePermission('gasoline.manage'), vehicleController.deleteGasolineFile);
router.get('/:vehicleId/gasoline-records/:gasolineId/download', requirePermission('gasoline.view'), vehicleController.downloadGasolineFile);

router.get('/:vehicleId/documents/:docId', requirePermission('vehicles.view'), vehicleController.getDocumentById);
router.post('/:vehicleId/documents', requirePermission('vehicles.documents'), documentUploadMiddleware, vehicleController.createDocument);
router.put('/:vehicleId/documents/:docId', requirePermission('vehicles.documents'), documentUploadMiddleware, vehicleController.updateDocument);
router.delete('/:vehicleId/documents/:docId', requirePermission('vehicles.documents'), vehicleController.deleteDocument);
router.delete('/:vehicleId/documents/:docId/files/:fileId', requirePermission('vehicles.documents'), vehicleController.deleteDocumentFile);
router.get('/:vehicleId/documents/:docId/download', requirePermission('vehicles.view'), vehicleController.downloadDocument);

export default router;
