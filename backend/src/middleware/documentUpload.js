import multer from 'multer';

// Usar memory storage en lugar de disk storage
const storage = multer.memoryStorage();

// Filtro para validar tipos de documentos permitidos
const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos para documentos
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Permitidos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF`), false);
  }
};

// Crear instancia de multer para documentos (memory storage)
const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
    files: 5 // Max 5 documentos por request
  }
});

// Middleware para documentos individuales
export const documentUploadMiddleware = (req, res, next) => {
  console.error('❌❌❌ [MULTER] Middleware invocado para', { method: req.method, path: req.path, contentType: req.headers['content-type'] });
  uploadDocuments.array('documento', 5)(req, res, (err) => {
    if (err) {
      console.error('❌ [MULTER] Error:', err.message);
      return res.status(400).json({ message: 'Error cargando archivos', error: err.message });
    }
    console.error('✅✅✅ [MULTER] Archivos procesados:', { numFiles: req.files?.length || 0, files: req.files?.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })) || [] });
    next();
  });
};

export default documentUploadMiddleware;

