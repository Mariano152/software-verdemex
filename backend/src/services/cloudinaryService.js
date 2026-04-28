import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.error(`🌐 [CLOUDINARY] Config: cloud_name=${process.env.CLOUDINARY_CLOUD_NAME || 'NOT_SET'} has_api_key=${!!process.env.CLOUDINARY_API_KEY} has_api_secret=${!!process.env.CLOUDINARY_API_SECRET}`);

const sanitizePublicId = (value = '') =>
  value
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

export const cloudinaryService = {
  async uploadImage(buffer, filename, options = {}) {
    if (!buffer) {
      throw new Error('Image buffer is required');
    }

    const folder = options.folder || process.env.CLOUDINARY_VEHICLE_PHOTOS_FOLDER || 'verdemex/vehiculos/fotos';
    const publicId = sanitizePublicId(filename) || `imagen_${Date.now()}`;
    const fileSize = options.fileSize || buffer.length || 0;

    return this.uploadDocumentFromBuffer(buffer, publicId, fileSize, {
      ...options,
      folder
    });
  },

  async uploadDocument(filePath, filename, fileSize = 0, options = {}) {
    const folder = options.folder || process.env.CLOUDINARY_DOCUMENTS_FOLDER || 'verdemex/documentos';
    const publicId = sanitizePublicId(filename) || `documento_${Date.now()}`;
    const isLargeFile = fileSize >= 9 * 1024 * 1024;

    console.error(`📤 [CLOUDINARY_UPLOAD] inicio filePath=${filePath} filename=${filename} size=${fileSize} folder=${folder} publicId=${publicId}`);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`❌ [CLOUDINARY_UPLOAD] ARCHIVO_NO_EXISTE filePath=${filePath}`);
      throw new Error(`File not found: ${filePath}`);
    }
    console.error(`✓ [CLOUDINARY_UPLOAD] archivo_existe_en_disco`);

    try {
      if (isLargeFile) {
        console.error(`📦 [CLOUDINARY_UPLOAD] usando upload_large para archivo grande`);
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_large(
            filePath,
            {
              folder,
              public_id: publicId,
              resource_type: 'raw',
              chunk_size: 6 * 1024 * 1024
            },
            (error, result) => {
              if (error) {
                console.error(`❌ [CLOUDINARY_UPLOAD] upload_large_FAIL:`, error.message);
                reject(error);
              } else {
                console.error(`✅ [CLOUDINARY_UPLOAD] upload_large_OK url=${result.secure_url}`);
                resolve(result.secure_url);
              }
            }
          );
        });
      }

      console.error(`📄 [CLOUDINARY_UPLOAD] usando upload normal`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        public_id: publicId,
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto'
      });

      console.error(`✅ [CLOUDINARY_UPLOAD] upload_OK url=${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      console.error(`❌ [CLOUDINARY_UPLOAD] upload_FAIL error:`, error.message);
      throw error;
    }
  },

  // Nuevo método para subir archivos desde buffer (sin guardar en disco)
  // Soporta archivos grandes (>10MB) automáticamente usando streaming
  async uploadDocumentFromBuffer(buffer, filename, fileSize = 0, options = {}) {
    const folder = options.folder || process.env.CLOUDINARY_DOCUMENTS_FOLDER || 'verdemex/documentos';
    const publicId = sanitizePublicId(filename) || `documento_${Date.now()}`;
    const isLargeFile = fileSize >= 9 * 1024 * 1024; // 9MB threshold

    console.error(`📤 [CLOUDINARY_BUFFER_UPLOAD] inicio filename=${filename} size=${fileSize} folder=${folder} publicId=${publicId} isLarge=${isLargeFile}`);

    try {
      return new Promise((resolve, reject) => {
        if (isLargeFile) {
          const mode = 'upload_large_stream';
          const largeOptions = {
            folder,
            public_id: publicId,
            resource_type: 'raw',
            chunk_size: 6 * 1024 * 1024,
            timeout: 300000
          };

          console.error(`ℹ️ [CLOUDINARY_BUFFER_UPLOAD] modo=${mode} chunk_size=${largeOptions.chunk_size} folder=${folder}`);

          const uploadStream = cloudinary.uploader.upload_large_stream(
            largeOptions,
            (error, result) => {
              if (error) {
                console.error(`❌ [CLOUDINARY_BUFFER_UPLOAD] upload_FAIL:`, error.message);
                reject(error);
                return;
              }

              const uploadedUrl = result?.secure_url;
              if (!uploadedUrl) {
                console.error(`⚠️ [CLOUDINARY_BUFFER_UPLOAD] resultado sin URL:`, result);
                reject(new Error('Cloudinary upload returned no URL'));
                return;
              }

              console.error(`✅ [CLOUDINARY_BUFFER_UPLOAD] ${mode}_OK url=${uploadedUrl}`);
              resolve(uploadedUrl);
            }
          );

          uploadStream.on('error', (error) => {
            console.error(`❌ [CLOUDINARY_BUFFER_UPLOAD] stream_error:`, error.message);
            reject(error);
          });

          uploadStream.end(buffer);
          return;
        }

        const mode = 'upload_stream';
        console.error(`ℹ️ [CLOUDINARY_BUFFER_UPLOAD] modo=${mode} chunk_size=n/a folder=${folder}`);

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: 'auto',
            timeout: 300000
          },
          (error, result) => {
            if (error) {
              console.error(`❌ [CLOUDINARY_BUFFER_UPLOAD] upload_FAIL:`, error.message);
              reject(error);
              return;
            }

            const uploadedUrl = result?.secure_url;
            if (!uploadedUrl) {
              console.error(`⚠️ [CLOUDINARY_BUFFER_UPLOAD] resultado sin URL:`, result);
              reject(new Error('Cloudinary upload returned no URL'));
              return;
            }

            console.error(`✅ [CLOUDINARY_BUFFER_UPLOAD] ${mode}_OK url=${uploadedUrl}`);
            resolve(uploadedUrl);
          }
        );

        uploadStream.on('error', (error) => {
          console.error(`❌ [CLOUDINARY_BUFFER_UPLOAD] stream_error:`, error.message);
          reject(error);
        });

        uploadStream.end(buffer);
      });
    } catch (error) {
      console.error(`❌ [CLOUDINARY_BUFFER_UPLOAD] upload_FAIL error:`, error.message);
      throw error;
    }
  },

  async uploadMultipleImages(files) {
    const uploadPromises = files
      .filter(file => file !== null && file !== undefined)
      .map(file => this.uploadDocument(file.path, `${Date.now()}_${file.originalname}`, file.size));

    return Promise.all(uploadPromises);
  }
};
