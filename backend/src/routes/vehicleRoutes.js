import express from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { verifyToken } from '../middleware/auth.js';
import { photoUploadMiddleware } from '../middleware/photoUpload.js';
import { documentUploadMiddleware } from '../middleware/documentUpload.js';

const router = express.Router();

// Todas las rutas de vehículos requieren autenticación
router.use(verifyToken);

// POST /api/vehicles - Crear vehículo con fotos
router.post('/', photoUploadMiddleware, vehicleController.createVehicle);

// PUT /api/vehicles/:id - Actualizar vehículo con fotos
router.put('/:id', photoUploadMiddleware, vehicleController.updateVehicle);

// GET /api/vehicles - Listar vehículos
router.get('/', vehicleController.listVehicles);

// GET /api/vehicles/:id - Obtener vehículo por ID
router.get('/:id', vehicleController.getVehicleById);

// ===== RUTAS PARA DOCUMENTOS INDIVIDUALES =====

// GET /api/vehicles/:vehicleId/documents/:docId - Obtener documento individual
router.get('/:vehicleId/documents/:docId', vehicleController.getDocumentById);

// POST /api/vehicles/:vehicleId/documents - Crear nuevo documento con archivos
router.post('/:vehicleId/documents', documentUploadMiddleware, vehicleController.createDocument);

// PUT /api/vehicles/:vehicleId/documents/:docId - Actualizar documento individual con archivos
router.put('/:vehicleId/documents/:docId', documentUploadMiddleware, vehicleController.updateDocument);

// DELETE /api/vehicles/:vehicleId/documents/:docId - Eliminar documento
router.delete('/:vehicleId/documents/:docId', vehicleController.deleteDocument);

// DELETE /api/vehicles/:vehicleId/documents/:docId/files/:fileId - Eliminar archivo individual
router.delete('/:vehicleId/documents/:docId/files/:fileId', vehicleController.deleteDocumentFile);

// GET /api/vehicles/:vehicleId/documents/:docId/download - Descargar archivo del documento
router.get('/:vehicleId/documents/:docId/download', vehicleController.downloadDocument);

export default router;
