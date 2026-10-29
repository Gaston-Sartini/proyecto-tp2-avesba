/**
 * Arma la respuesta con los dos tokens de un usuario (la usan registro, login y refresh).
 * El payload lleva solo lo mínimo: `sub` (el id como string, es el estándar de JWT) y `role`.
 * Nunca datos sensibles: el contenido de un JWT se puede leer sin conocer el secreto.
 */
function issueTokens(user, tokens) {
  return {
    access_token: tokens.signAccess({ sub: String(user.id), role: user.role }),
    refresh_token: tokens.signRefresh({ sub: String(user.id) }),
    token_type: "bearer",
    expires_in: tokens.accessExpiresInSeconds,
  };
}

export default issueTokens;
