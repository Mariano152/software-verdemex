import cloudinaryPkg from 'cloudinary';

const DEFAULT_FOLDER = process.env.CLOUDINARY_DOCUMENTS_FOLDER || 'verdemex/documentos';

const sanitizePublicId = (value = '') =>
  value
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

export const uploadController = {
  async getCloudinarySignature(req, res) {
    try {
      const folder = req.query.folder || DEFAULT_FOLDER;
      const filename = req.query.filename || 'documento.pdf';
      const publicId = req.query.public_id || sanitizePublicId(filename) || `documento_${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000);

      const paramsToSign = {
        folder,
        public_id: publicId,
        timestamp
      };

      const signature = cloudinaryPkg.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET
      );

      res.json({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder,
        publicId,
        timestamp,
        signature,
        uploadPath: 'raw'
      });
    } catch (error) {
      console.error('❌ Error generando firma de Cloudinary:', error);
      res.status(500).json({
        message: 'Error al generar firma de Cloudinary',
        error: error.message
      });
    }
  }
};