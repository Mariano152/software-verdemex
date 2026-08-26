import express from 'express';
import { expedienteController } from '../controllers/expedienteController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Obtener expedientes de un vehículo
router.get('/vehicle/:vehicleId', verifyToken, requirePermission('vehicles.view'), expedienteController.getExpedientesByVehicle);

// Crear expediente
router.post('/vehicle/:vehicleId', verifyToken, requirePermission('vehicles.documents'), expedienteController.createExpediente);

// Obtener un expediente con sus items
router.get('/:expedienteId', verifyToken, requirePermission('vehicles.view'), expedienteController.getExpedienteById);

// Actualizar expediente
router.put('/:expedienteId', verifyToken, requirePermission('vehicles.documents'), expedienteController.updateExpediente);

// Eliminar expediente
router.delete('/:expedienteId', verifyToken, requirePermission('vehicles.documents'), expedienteController.deleteExpediente);

// Crear item en expediente
router.post('/:expedienteId/items', verifyToken, requirePermission('vehicles.documents'), expedienteController.createExpedienteItem);

// Actualizar item de expediente
router.put('/items/:itemId', verifyToken, requirePermission('vehicles.documents'), expedienteController.updateExpedienteItem);

// Toggle completación de item
router.patch('/items/:itemId/toggle', verifyToken, requirePermission('vehicles.documents'), expedienteController.toggleItemCompletion);

// Eliminar item
router.delete('/items/:itemId', verifyToken, requirePermission('vehicles.documents'), expedienteController.deleteExpedienteItem);

export default router;
