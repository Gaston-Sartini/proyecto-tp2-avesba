import AppError from "../../errors/AppError.js";

/**
 * Caso de Uso: Ver los datos de un usuario.
 * Regla de autorización por dueño: un "jugador" solo puede verse a sí mismo.
 * Moderadores y admins pueden ver a cualquiera.
 * Va en el caso de uso (y no en el router con authorize) porque depende de QUIÉN pide
 * y de A QUIÉN pertenece el dato, no solo del rol.
 */
async function getUserById(id, actor, { usersDao }) {
  const user = await usersDao.getById(id);
  if (!user) {
    throw new AppError("USER_NOT_FOUND", `Usuario ${id} no encontrado`, 404);
  }

  if (actor.role === "jugador" && actor.id !== user.id) {
    throw new AppError("FORBIDDEN", "No tenés permisos para ver este usuario", 403);
  }

  return user;
}

export default getUserById;
