import AppError from "../../errors/AppError.js";

/**
 * Caso de Uso: Eliminar una partida y sus respuestas (solo admins, lo controla el router).
 * Sirve, por ejemplo, para borrar una partida tramposa: deja de contar en el ranking y las métricas.
 * Primero se borran las respuestas y después la partida (la base no deja borrar algo que otra tabla referencia).
 */
async function deletePartida(id, { gameSessionsDao, gameResultsDao }) {
  const partida = await gameSessionsDao.getById(id);
  if (!partida) {
    throw new AppError("PARTIDA_NOT_FOUND", `No existe una partida con id ${id}`, 404);
  }

  await gameResultsDao.deleteBySession(id);
  await gameSessionsDao.delete(id);
}

export default deletePartida;
