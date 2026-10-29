import AppError from "../errors/AppError.js";

// Arma el cuerpo de todas las respuestas de error.
// - `error`: el formato estándar del curso { code, message, details? }.
// - `detail`: el texto que muestra el front de AvesBA (su httpClient lee `errorData.detail`,
//   que es como respondía el backend de Python). Si hay errores de validación, va el primero.
function buildErrorBody(code, message, details) {
  return {
    error: { code, message, ...(details && { details }) },
    detail: details?.[0]?.message ?? message,
  };
}

// Manejador centralizado de errores (middleware de 4 parámetros: Express lo reconoce por eso)
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(buildErrorBody(err.code, err.message, err.details));
  }

  // express.json() lanza este error cuando el body no es un JSON válido
  if (err.type === "entity.parse.failed") {
    return res.status(400).json(buildErrorBody("INVALID_JSON", "El body no es un JSON válido"));
  }

  console.error("Unhandled error:", err);
  res.status(500).json(buildErrorBody("INTERNAL_ERROR", "Ocurrió un error inesperado en el servidor"));
}

export default errorHandler;
