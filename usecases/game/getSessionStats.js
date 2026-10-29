import AppError from "../../errors/AppError.js";
import { resumirRespuestas } from "./gameRules.js";

/**
 * Caso de Uso: Estadísticas de la partida activa (puntos, intentos, aciertos y porcentaje hasta ahora).
 * Se calculan en el momento con las respuestas dadas.
 */
async function getSessionStats(actor, { gameSessionsDao, gameResultsDao }) {
  const session = await gameSessionsDao.getActiveByUser(actor.id);
  if (!session) {
    throw new AppError("NO_ACTIVE_SESSION", "No hay una sesión activa", 404);
  }

  const respuestas = await gameResultsDao.getBySession(session.id);
  const { puntos_totales, total_intentos, total_aciertos, porcentaje_acierto } = resumirRespuestas(respuestas);

  return {
    session_id: session.id,
    puntos_totales,
    total_intentos,
    total_aciertos,
    estado: session.estado,
    porcentaje_acierto,
  };
}

export default getSessionStats;
