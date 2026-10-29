import AppError from "../../errors/AppError.js";

/**
 * Caso de Uso: Cambiar mi contraseña.
 * Regla de negocio: hay que mandar la contraseña ACTUAL correcta además de la nueva.
 * Así, si alguien encuentra la sesión abierta, no puede cambiar la contraseña y quedarse con la cuenta.
 */
async function changePassword(actor, { current_password, new_password }, { usersDao, hasher }) {
  const user = await usersDao.getById(actor.id);
  if (!user) {
    throw new AppError("USER_NOT_FOUND", `Usuario ${actor.id} no encontrado`, 404);
  }

  // getCredentialsByEmail es el único método del DAO que trae el hash
  const credentials = await usersDao.getCredentialsByEmail(user.email);
  const valid = await hasher.compare(current_password, credentials.passwordHash);
  if (!valid) {
    throw new AppError("WRONG_PASSWORD", "La contraseña actual es incorrecta", 400);
  }

  await usersDao.update(actor.id, { passwordHash: await hasher.hash(new_password), updatedAt: Date.now() });

  return { message: "Contraseña actualizada exitosamente" };
}

export default changePassword;
