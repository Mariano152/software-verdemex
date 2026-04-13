import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryService = {
  // Subir archivo a Cloudinary
  async uploadImage(fileBuffer, filename) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: process.env.CLOUDINARY_FOLDER || 'verdemex/vehicles',
          public_id: filename,
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      // Convertir Buffer a Stream y enviar a Cloudinary
      const stream = Readable.from(fileBuffer);
      stream.pipe(uploadStream);
    });
  },

  // Subir múltiples archivos
  async uploadMultipleImages(files) {
    const uploadPromises = files
      .filter(file => file !== null && file !== undefined)
      .map(file => 
        this.uploadImage(
          file.buffer,
          `${Date.now()}_${file.originalname}`
        )
      );

    return Promise.all(uploadPromises);
  }
};
