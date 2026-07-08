import express from 'express';
import { userController } from '../controllers/userController.js';
import { requireRole, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', userController.listUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);

export default router;
