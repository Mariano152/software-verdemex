import express from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { verifyToken } from '../middleware/auth.js';
import { photoUploadMiddleware } from '../middleware/photoUpload.js';

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

export default router;
