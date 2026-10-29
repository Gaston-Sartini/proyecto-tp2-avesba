import { NODE_ENV } from "../config/config.js";

// Middleware de aplicación: registra la petición y pasa el control al siguiente handler.
// En los tests no imprime nada para que la salida quede limpia.
function logger(req, res, next) {
  if (NODE_ENV !== "test") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
}

export default logger;
