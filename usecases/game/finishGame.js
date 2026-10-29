import AppError from "../../errors/AppError.js";
import closeSession from "./closeSession.js";

/**
 * Caso de Uso: Terminar la partida activa y guardar el puntaje.
 */
async function finishGame(actor, deps) {
  const session = await deps.gameSessionsDao.getActiveByUser(actor.id);
  if (!session) {
    throw new AppError("NO_ACTIVE_SESSION", "No hay una sesión activa", 404);
  }

  const resumen = await closeSession(session, deps);

  return { ...resumen, mensaje: "Sesión finalizada. Puntuación guardada." };
}

export default finishGame;
