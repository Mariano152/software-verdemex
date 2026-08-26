import express from 'express';
import { driverController } from '../controllers/driverController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';
import { driverUploadMiddleware } from '../middleware/driverUpload.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requirePermission('drivers.view', 'dashboard.view', 'analytics.view', 'users.manage'), driverController.listDrivers);
router.get('/:id', requirePermission('drivers.view'), driverController.getDriverById);
router.post('/', requirePermission('drivers.manage'), driverUploadMiddleware, driverController.createDriver);
router.put('/:id', requirePermission('drivers.manage'), driverUploadMiddleware, driverController.updateDriver);
router.get('/:id/documents/:docId', requirePermission('drivers.view'), driverController.getDocumentById);
router.post('/:id/documents', requirePermission('drivers.manage'), documentUploadMiddleware, driverController.createDocument);
router.put('/:id/documents/:docId', requirePermission('drivers.manage'), documentUploadMiddleware, driverController.updateDocument);
router.delete('/:id/documents/:docId', requirePermission('drivers.manage'), driverController.deleteDocument);
router.delete('/:id/documents/:docId/files/:fileId', requirePermission('drivers.manage'), driverController.deleteDocumentFile);
router.get('/:id/documents/:docId/download', requirePermission('drivers.view'), driverController.downloadDocument);
router.get('/:id/history/:historyId', requirePermission('drivers.view'), driverController.getHistoryById);
router.post('/:id/history', requirePermission('drivers.manage'), documentUploadMiddleware, driverController.createHistory);
router.put('/:id/history/:historyId', requirePermission('drivers.manage'), documentUploadMiddleware, driverController.updateHistory);
router.delete('/:id/history/:historyId', requirePermission('drivers.manage'), driverController.deleteHistory);
router.delete('/:id/history/:historyId/files/:fileId', requirePermission('drivers.manage'), driverController.deleteHistoryFile);
router.get('/:id/history/:historyId/download', requirePermission('drivers.view'), driverController.downloadHistoryFile);
router.get('/:id/ratings/:ratingId', requirePermission('drivers.view', 'drivers.rate'), driverController.getRatingById);
router.post('/:id/ratings', requirePermission('drivers.rate'), documentUploadMiddleware, driverController.createRating);
router.put('/:id/ratings/:ratingId', requirePermission('drivers.rate'), documentUploadMiddleware, driverController.updateRating);
router.delete('/:id/ratings/:ratingId', requirePermission('drivers.rate'), driverController.deleteRating);
router.delete('/:id/ratings/:ratingId/files/:fileId', requirePermission('drivers.rate'), driverController.deleteRatingFile);
router.get('/:id/ratings/:ratingId/download', requirePermission('drivers.view', 'drivers.rate'), driverController.downloadRatingFile);
router.post('/:id/emergency-contacts', requirePermission('drivers.manage'), driverController.createEmergencyContact);
router.put('/:id/emergency-contacts/:contactId', requirePermission('drivers.manage'), driverController.updateEmergencyContact);
router.delete('/:id/emergency-contacts/:contactId', requirePermission('drivers.manage'), driverController.deleteEmergencyContact);

export default router;
