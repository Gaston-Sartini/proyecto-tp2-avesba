// Error personalizado de la aplicación para errores esperados (de negocio o de HTTP).
// Lo lanzan los casos de uso y los middlewares; lo convierte en respuesta el errorHandler.
class AppError extends Error {
  constructor(code, message, statusCode = 400, details = undefined) {
    super(message);
    this.name = "AppError";
    this.code = code; // código estable para máquinas (ej: "INVALID_CREDENTIALS")
    this.statusCode = statusCode; // status HTTP de la respuesta
    this.details = details; // información extra opcional (ej: qué campos fallaron)
  }
}

export default AppError;
