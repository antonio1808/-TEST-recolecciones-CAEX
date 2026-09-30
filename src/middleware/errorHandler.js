const AppError = require('../errors');

// Manejo centralizado de errores: todas las respuestas de error tienen el mismo formato.
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.status === 404 ? 'No encontrado' : 'Solicitud inválida',
      mensaje: err.message,
      detalles: err.detalles,
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Solicitud inválida', mensaje: 'El cuerpo de la petición no es un JSON válido.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno', mensaje: 'Ocurrió un error inesperado. Intenta de nuevo.' });
};
