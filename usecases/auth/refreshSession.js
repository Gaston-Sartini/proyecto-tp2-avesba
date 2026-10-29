import AppError from "../../errors/AppError.js";
import issueTokens from "./issueTokens.js";

/**
 * Caso de Uso: Renovar los tokens con el refresh token.
 * Reglas de negocio:
 *  - Solo acepta un refresh token (un access token no sirve acá).
 *  - El usuario tiene que seguir existiendo y estar activo.
 */
async function refreshSession(refreshToken, { usersDao, tokens }) {
  if (!refreshToken) {
    throw new AppError("TOKEN_MISSING", "Falta el refresh_token", 401);
  }

  const payload = tokens.verify(refreshToken);
  if (payload.type !== "refresh") {
    throw new AppError("TOKEN_INVALID", "Token de refresco inválido", 401);
  }

  const user = await usersDao.getById(Number(payload.sub));
  if (!user || !user.is_active) {
    throw new AppError("USER_INACTIVE", "Usuario no encontrado o inactivo", 401);
  }

  return issueTokens(user, tokens);
}

export default refreshSession;
