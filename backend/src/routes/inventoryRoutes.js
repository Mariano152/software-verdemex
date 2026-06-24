import express from 'express';
import { inventoryController } from '../controllers/inventoryController.js';
import { verifyToken } from '../middleware/auth.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/pipas', inventoryController.listPipas);
router.get('/pipas/:pipaId/consumption-history', inventoryController.getPipaConsumptionHistory);
router.get('/pipas/:pipaId', inventoryController.getPipaById);
router.post('/pipas', inventoryController.createPipa);
router.put('/pipas/:pipaId', inventoryController.updatePipa);
router.delete('/pipas/:pipaId', inventoryController.deletePipa);

router.get('/records', inventoryController.listRecords);
router.get('/records/:recordId', inventoryController.getRecordById);
router.post('/records', documentUploadMiddleware, inventoryController.createRecord);
router.put('/records/:recordId', documentUploadMiddleware, inventoryController.updateRecord);
router.delete('/records/:recordId', inventoryController.deleteRecord);
router.get('/records/:recordId/download', inventoryController.downloadRecordDocument);

export default router;
