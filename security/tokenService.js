import jwt from "jsonwebtoken";
import AppError from "../errors/AppError.js";

/**
 * Servicio de tokens JWT. Igual que el hasheador, se crea en el contenedor y se inyecta.
 *
 * Maneja dos tokens (como el backend de Python):
 * - access: dura poco (15 min) y es el que abre la API.
 * - refresh: dura mucho (7 días) y SOLO sirve para pedir un access nuevo en POST /auth/refresh.
 * El campo `type` dentro del token dice cuál es cuál.
 */
function createTokenService({ secret, accessExpiresInSeconds, refreshExpiresInSeconds }) {
  return {
    accessExpiresInSeconds,

    signAccess: (payload) => jwt.sign({ ...payload, type: "access" }, secret, { expiresIn: accessExpiresInSeconds }),

    signRefresh: (payload) => jwt.sign({ ...payload, type: "refresh" }, secret, { expiresIn: refreshExpiresInSeconds }),

    verify(token) {
      try {
        // Fijamos el algoritmo para que nadie pueda cambiarlo desde el header del token ("alg": "none")
        return jwt.verify(token, secret, { algorithms: ["HS256"] });
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          throw new AppError("TOKEN_EXPIRED", "El token venció, iniciá sesión de nuevo", 401);
        }
        throw new AppError("TOKEN_INVALID", "Token inválido", 401);
      }
    },
  };
}

export default createTokenService;
