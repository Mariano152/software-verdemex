/**
 * Middleware de manejo de errores global
 * Captura errores de todas las rutas y los retorna en un formato consistente
 */
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    error: true,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
  