import express from 'express';
import { inventoryController } from '../controllers/inventoryController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/pipas', requirePermission('inventory.view', 'analytics.view'), inventoryController.listPipas);
router.get('/pipas/:pipaId/consumption-history', requirePermission('inventory.view'), inventoryController.getPipaConsumptionHistory);
router.get('/pipas/:pipaId', requirePermission('inventory.view'), inventoryController.getPipaById);
router.post('/pipas', requirePermission('inventory.manage'), inventoryController.createPipa);
router.put('/pipas/:pipaId', requirePermission('inventory.manage'), inventoryController.updatePipa);
router.delete('/pipas/:pipaId', requirePermission('inventory.manage'), inventoryController.deletePipa);

router.get('/records', requirePermission('inventory.view', 'analytics.view'), inventoryController.listRecords);
router.get('/records/:recordId', requirePermission('inventory.view'), inventoryController.getRecordById);
router.post('/records', requirePermission('inventory.manage'), documentUploadMiddleware, inventoryController.createRecord);
router.put('/records/:recordId', requirePermission('inventory.manage'), documentUploadMiddleware, inventoryController.updateRecord);
router.delete('/records/:recordId', requirePermission('inventory.manage'), inventoryController.deleteRecord);
router.get('/records/:recordId/download', requirePermission('inventory.view'), inventoryController.downloadRecordDocument);

export default router;
