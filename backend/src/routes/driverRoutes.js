import express from 'express';
import { driverController } from '../controllers/driverController.js';
import { verifyToken } from '../middleware/auth.js';
import { driverUploadMiddleware } from '../middleware/driverUpload.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', driverController.listDrivers);
router.get('/:id', driverController.getDriverById);
router.post('/', driverUploadMiddleware, driverController.createDriver);
router.put('/:id', driverUploadMiddleware, driverController.updateDriver);
router.get('/:id/documents/:docId', driverController.getDocumentById);
router.post('/:id/documents', documentUploadMiddleware, driverController.createDocument);
router.put('/:id/documents/:docId', documentUploadMiddleware, driverController.updateDocument);
router.delete('/:id/documents/:docId', driverController.deleteDocument);
router.delete('/:id/documents/:docId/files/:fileId', driverController.deleteDocumentFile);
router.get('/:id/documents/:docId/download', driverController.downloadDocument);
router.get('/:id/history/:historyId', driverController.getHistoryById);
router.post('/:id/history', documentUploadMiddleware, driverController.createHistory);
router.put('/:id/history/:historyId', documentUploadMiddleware, driverController.updateHistory);
router.delete('/:id/history/:historyId', driverController.deleteHistory);
router.delete('/:id/history/:historyId/files/:fileId', driverController.deleteHistoryFile);
router.get('/:id/history/:historyId/download', driverController.downloadHistoryFile);
router.get('/:id/ratings/:ratingId', driverController.getRatingById);
router.post('/:id/ratings', documentUploadMiddleware, driverController.createRating);
router.put('/:id/ratings/:ratingId', documentUploadMiddleware, driverController.updateRating);
router.delete('/:id/ratings/:ratingId', driverController.deleteRating);
router.delete('/:id/ratings/:ratingId/files/:fileId', driverController.deleteRatingFile);
router.get('/:id/ratings/:ratingId/download', driverController.downloadRatingFile);
router.post('/:id/emergency-contacts', driverController.createEmergencyContact);
router.put('/:id/emergency-contacts/:contactId', driverController.updateEmergencyContact);
router.delete('/:id/emergency-contacts/:contactId', driverController.deleteEmergencyContact);

export default router;
