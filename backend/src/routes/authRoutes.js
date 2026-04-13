import express from 'express';
import { authController } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Crear nueva cuenta
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/logout
 * Cerrar sesión (requerido token)
 */
router.post('/logout', verifyToken, authController.logout);

/**
 * GET /api/auth/me
 * Obtener perfil del usuario autenticado
 */
router.get('/me', verifyToken, authController.getProfile);

/**
 * POST /api/auth/verify
 * Verificar si token es válido
 */
router.post('/verify', verifyToken, authController.verifyToken);

export default router;
