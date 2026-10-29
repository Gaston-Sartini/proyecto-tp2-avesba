import AppError from "../../errors/AppError.js";

/**
 * Caso de Uso: Eliminar un usuario (solo admins, lo controla el router).
 * Reglas de negocio:
 *  - Un admin no puede eliminarse a sí mismo (se quedaría el sistema sin quien lo administre).
 *  - El usuario tiene que existir.
 *  - Se borran también sus partidas y respuestas: primero las respuestas, después las partidas
 *    y al final el usuario (la base no deja borrar algo que otra tabla todavía referencia).
 */
async function deleteUser(id, actor, { usersDao, gameSessionsDao, gameResultsDao }) {
  if (actor.id === id) {
    throw new AppError("CANNOT_DELETE_SELF", "No podés eliminar tu propio usuario", 409);
  }

  const user = await usersDao.getById(id);
  if (!user) {
    throw new AppError("USER_NOT_FOUND", `Usuario ${id} no encontrado`, 404);
  }

  await gameResultsDao.deleteByUser(id);
  await gameSessionsDao.deleteByUser(id);
  await usersDao.delete(id);
}

export default deleteUser;
