import AppError from "../errors/AppError.js";

/**
 * Contador de intentos fallidos de login por email (en memoria).
 * Después de `maxAttempts` fallos dentro de la ventana de tiempo, el login de ese email
 * queda bloqueado hasta que pase la ventana. Frena a quien prueba contraseñas a lo loco.
 *
 * Igual que en el backend de Python vive en memoria: si el servidor se reinicia, se borra.
 * (En producción se usaría algo compartido, como Redis.)
 */
function createLoginAttempts({ maxAttempts, windowMs }) {
  const attempts = new Map(); // email -> { count, firstAt }

  const isExpired = (entry) => Date.now() - entry.firstAt >= windowMs;

  return {
    // Lanza 429 si el email está bloqueado
    check(email) {
      const entry = attempts.get(email);
      if (entry && !isExpired(entry) && entry.count >= maxAttempts) {
        throw new AppError("TOO_MANY_ATTEMPTS", "Máximo de intentos de login excedido. Intentá más tarde.", 429);
      }
    },

    registerFailure(email) {
      const entry = attempts.get(email);
      if (!entry || isExpired(entry)) {
        attempts.set(email, { count: 1, firstAt: Date.now() });
      } else {
        entry.count += 1;
      }
    },

    clear(email) {
      attempts.delete(email);
    },
  };
}

export default createLoginAttempts;
