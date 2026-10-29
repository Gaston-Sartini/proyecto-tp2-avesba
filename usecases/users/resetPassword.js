import { randomInt } from "node:crypto";
import AppError from "../../errors/AppError.js";

const CARACTERES = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// randomInt de node:crypto es aleatorio "de verdad" (Math.random no sirve para contraseñas)
function generarPassword(largo = 12) {
  return Array.from({ length: largo }, () => CARACTERES[randomInt(CARACTERES.length)]).join("");
}

/**
 * Caso de Uso: Resetear la contraseña de un usuario (solo admins, lo controla el router).
 * Genera una contraseña nueva al azar y la devuelve UNA vez para que el admin se la pase al usuario.
 */
async function resetPassword(id, { usersDao, hasher }) {
  const user = await usersDao.getById(id);
  if (!user) {
    throw new AppError("USER_NOT_FOUND", `Usuario ${id} no encontrado`, 404);
  }

  const newPassword = generarPassword();
  await usersDao.update(id, { passwordHash: await hasher.hash(newPassword), updatedAt: Date.now() });

  return {
    user_id: user.id,
    new_password: newPassword,
    message: "Contraseña reseteada. Guardá la nueva contraseña.",
  };
}

export default resetPassword;
