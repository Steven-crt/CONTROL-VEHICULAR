class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Solicitud invalida', code = 'BAD_REQUEST') {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = 'No autorizado', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Acceso denegado', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Recurso no encontrado', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message = 'Conflicto con datos existentes', code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  static validation(message = 'Error de validacion', code = 'VALIDATION_ERROR') {
    return new AppError(message, 422, code);
  }

  static tooMany(message = 'Demasiadas solicitudes', code = 'RATE_LIMIT') {
    return new AppError(message, 429, code);
  }

  static internal(message = 'Error interno del servidor', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code);
  }
}

module.exports = AppError;
