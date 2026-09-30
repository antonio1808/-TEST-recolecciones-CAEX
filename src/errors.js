// Error de negocio con código HTTP asociado.
class AppError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

module.exports = AppError;
