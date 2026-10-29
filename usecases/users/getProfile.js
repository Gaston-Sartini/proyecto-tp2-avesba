import AppError from "../../errors/AppError.js";

/**
 * Caso de Uso: Mi perfil (el usuario del token).
 * No recibe ningún id de la URL: el id sale del token, así nadie puede pedir el perfil de otro.
 */
async function getProfile(actor, { usersDao }) {
  const user = await usersDao.getById(actor.id);
  if (!user) {
    throw new AppError("USER_NOT_FOUND", `Usuario ${actor.id} no encontrado`, 404);
  }
  return user;
}

export default getProfile;
