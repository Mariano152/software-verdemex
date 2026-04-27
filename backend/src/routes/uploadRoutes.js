import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { uploadController } from '../controllers/uploadController.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/uploads/cloudinary-signature
router.get('/cloudinary-signature', uploadController.getCloudinarySignature);

export default router;