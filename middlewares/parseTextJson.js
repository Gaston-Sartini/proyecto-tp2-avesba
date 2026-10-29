import AppError from "../errors/AppError.js";

/**
 * Convierte un body de texto plano que adentro tiene JSON en un objeto.
 * Hace falta para navigator.sendBeacon (lo usa el front al cerrar la pestaña):
 * manda el JSON como "text/plain", así que express.json() no lo reconoce.
 * Se usa después de express.text(), que deja el texto en req.body.
 */
function parseTextJson(req, res, next) {
  if (typeof req.body !== "string") return next();

  try {
    req.body = JSON.parse(req.body);
    next();
  } catch {
    next(new AppError("INVALID_JSON", "El body no es un JSON válido", 400));
  }
}

export default parseTextJson;
