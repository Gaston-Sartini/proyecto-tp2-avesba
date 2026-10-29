import AppError from "../../errors/AppError.js";
import issueTokens from "./issueTokens.js";

/**
 * Caso de Uso: Iniciar sesión.
 * Reglas de negocio:
 *  - Si el email no existe O la contraseña no coincide, se lanza el MISMO error.
 *    Si dijéramos "ese email no existe", cualquiera podría usar el login para averiguar
 *    qué personas tienen cuenta. A quien todavía no se autenticó, no se le da más info de la necesaria.
 *  - Un usuario inactivo (dado de baja) no puede entrar.
 *  - Después de varios intentos fallidos con el mismo email, se bloquea un rato (429).
 */
async function loginUser({ email, password }, { usersDao, hasher, tokens, loginAttempts }) {
  loginAttempts.check(email);

  const credentials = await usersDao.getCredentialsByEmail(email);
  const valid = credentials && (await hasher.compare(password, credentials.passwordHash));
  if (!valid) {
    loginAttempts.registerFailure(email);
    throw new AppError("INVALID_CREDENTIALS", "Email o contraseña inválidos", 401);
  }

  if (!credentials.is_active) {
    throw new AppError("USER_INACTIVE", "El usuario está inactivo", 401);
  }

  loginAttempts.clear(email);
  const user = await usersDao.update(credentials.id, { lastLogin: Date.now() });

  return issueTokens(user, tokens);
}

export default loginUser;
