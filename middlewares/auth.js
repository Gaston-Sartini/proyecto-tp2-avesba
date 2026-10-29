import AppError from "../errors/AppError.js";

/**
 * Middlewares de autenticación y autorización.
 * Reciben el servicio de tokens por parámetro (no importan jsonwebtoken).
 */
function createAuthMiddlewares(tokens) {
  // ¿Quién sos? Busca el token, lo verifica y deja req.user = { id, role }
  function authenticate(req, res, next) {
    // 1° el header Authorization: Bearer <token> (REST Client, apps, Postman)
    // 2° la cookie access_token (el front de AvesBA en el navegador)
    const [scheme, headerToken] = (req.headers.authorization ?? "").split(" ");
    const token = scheme === "Bearer" && headerToken ? headerToken : req.cookies?.access_token;

    if (!token) {
      return next(new AppError("TOKEN_MISSING", "Token de autenticación faltante", 401));
    }

    try {
      const payload = tokens.verify(token);
      // El refresh token solo sirve para pedir tokens nuevos, no para entrar a la API
      if (payload.type !== "access") {
        throw new AppError("TOKEN_INVALID", "Token inválido", 401);
      }
      req.user = { id: Number(payload.sub), role: payload.role };
      next();
    } catch (err) {
      next(err);
    }
  }

  // ¿Tenés permiso? Es una factory: authorize("admin", "moderador") devuelve un middleware
  const authorize =
    (...roles) =>
    (req, res, next) => {
      if (!roles.includes(req.user?.role)) {
        return next(new AppError("FORBIDDEN", "Acceso denegado: no tenés permiso para realizar esta acción", 403));
      }
      next();
    };

  return { authenticate, authorize };
}

export default createAuthMiddlewares;
