import express from 'express';
import { expedienteController } from '../controllers/expedienteController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Obtener expedientes de un vehículo
router.get('/vehicle/:vehicleId', verifyToken, expedienteController.getExpedientesByVehicle);

// Crear expediente
router.post('/vehicle/:vehicleId', verifyToken, expedienteController.createExpediente);

// Obtener un expediente con sus items
router.get('/:expedienteId', verifyToken, expedienteController.getExpedienteById);

// Actualizar expediente
router.put('/:expedienteId', verifyToken, expedienteController.updateExpediente);

// Eliminar expediente
router.delete('/:expedienteId', verifyToken, expedienteController.deleteExpediente);

// Crear item en expediente
router.post('/:expedienteId/items', verifyToken, expedienteController.createExpedienteItem);

// Actualizar item de expediente
router.put('/items/:itemId', verifyToken, expedienteController.updateExpedienteItem);

// Toggle completación de item
router.patch('/items/:itemId/toggle', verifyToken, expedienteController.toggleItemCompletion);

// Eliminar item
router.delete('/items/:itemId', verifyToken, expedienteController.deleteExpedienteItem);

export default router;
