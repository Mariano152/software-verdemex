import multer from 'multer';

// Configurar multer para archivos en memoria
const storage = multer.memoryStorage();

// Filtro para validar solo imágenes
const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Crear instancia de multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 13 // Max 13 fotos
  }
});

// Middleware para parsear múltiples archivos de foto
export const photoUploadMiddleware = upload.fields([
  { name: 'imagen', maxCount: 1 }, // Imagen principal (RF1)
  { name: 'frente', maxCount: 1 },
  { name: 'parte_trasera', maxCount: 1 },
  { name: 'lado_piloto', maxCount: 1 },
  { name: 'lado_copiloto', maxCount: 1 },
  { name: 'senales_y_luces', maxCount: 1 },
  { name: 'estrobos', maxCount: 1 },
  { name: 'extintor', maxCount: 1 },
  { name: 'rotulacion', maxCount: 1 },
  { name: 'torreta', maxCount: 1 },
  { name: 'proteccion_antiderrames', maxCount: 1 },
  { name: 'equipo_comunicacion', maxCount: 1 },
  { name: 'arnes_y_conectores', maxCount: 1 },
  { name: 'equipo_proteccion_personal', maxCount: 1 }
]);

export default photoUploadMiddleware;
