import AppError from "../../errors/AppError.js";
import assertCanAccess from "./assertCanAccess.js";

/**
 * Caso de Uso: Ver una partida con todas sus respuestas (la relación 1 a N: partida → respuestas).
 */
async function getPartida(id, actor, { gameSessionsDao, gameResultsDao }) {
  const partida = await gameSessionsDao.getById(id);
  if (!partida) {
    throw new AppError("PARTIDA_NOT_FOUND", `No existe una partida con id ${id}`, 404);
  }
  assertCanAccess(partida, actor);

  const respuestas = await gameResultsDao.getBySession(id);
  return { ...partida, respuestas };
}

export default getPartida;
