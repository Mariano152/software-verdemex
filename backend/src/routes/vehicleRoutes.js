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

// GET /api/vehicles/:vehicleId/safety-elements - Obtener elementos de seguridad del vehículo
router.get('/:vehicleId/safety-elements', vehicleController.getSafetyElements);

// POST /api/vehicles/:vehicleId/safety-elements - Crear/actualizar elementos de seguridad del vehículo
router.post('/:vehicleId/safety-elements', vehicleController.createSafetyElements);

// PUT /api/vehicles/:vehicleId/safety-elements/:elementId - Actualizar un elemento de seguridad
router.put('/:vehicleId/safety-elements/:elementId', vehicleController.updateSafetyElement);

// DELETE /api/vehicles/:vehicleId/safety-elements/:elementId - Eliminar un elemento de seguridad
router.delete('/:vehicleId/safety-elements/:elementId', vehicleController.deleteSafetyElement);

// ===== RUTAS PARA HISTORIAL DE MANTENIMIENTO =====

// GET /api/vehicles/:vehicleId/maintenance-records/:maintenanceId - Obtener registro individual
router.get('/:vehicleId/maintenance-records/:maintenanceId', vehicleController.getMaintenanceRecordById);

// POST /api/vehicles/:vehicleId/maintenance-records - Crear registro con archivos
router.post('/:vehicleId/maintenance-records', documentUploadMiddleware, vehicleController.createMaintenanceRecord);

// PUT /api/vehicles/:vehicleId/maintenance-records/:maintenanceId - Actualizar registro con archivos
router.put('/:vehicleId/maintenance-records/:maintenanceId', documentUploadMiddleware, vehicleController.updateMaintenanceRecord);

// DELETE /api/vehicles/:vehicleId/maintenance-records/:maintenanceId - Eliminar registro
router.delete('/:vehicleId/maintenance-records/:maintenanceId', vehicleController.deleteMaintenanceRecord);

// DELETE /api/vehicles/:vehicleId/maintenance-records/:maintenanceId/files/:fileId - Eliminar archivo individual
router.delete('/:vehicleId/maintenance-records/:maintenanceId/files/:fileId', vehicleController.deleteMaintenanceFile);

// GET /api/vehicles/:vehicleId/maintenance-records/:maintenanceId/download - Descargar archivo adjunto
router.get('/:vehicleId/maintenance-records/:maintenanceId/download', vehicleController.downloadMaintenanceFile);

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
