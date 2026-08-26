import express from 'express';
import { userController } from '../controllers/userController.js';
import { requirePermission, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);
router.use(requirePermission('users.manage'));

router.get('/', userController.listUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
