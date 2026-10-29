import AppError from "../../errors/AppError.js";
import { puntosDe } from "./gameRules.js";

/**
 * Caso de Uso: Retomar la partida activa (por ejemplo, si el jugador recarga la página).
 * Devuelve el lote de preguntas, las respuestas que ya dio (en orden), la racha y los puntos.
 * Con eso el front sabe en qué pregunta estaba.
 */
async function getActiveSession(actor, { gameSessionsDao, gameResultsDao }) {
  const session = await gameSessionsDao.getActiveByUser(actor.id);
  if (!session) {
    throw new AppError("NO_ACTIVE_SESSION", "No hay una sesión activa", 404);
  }

  const respuestas = await gameResultsDao.getBySession(session.id);

  return {
    session_id: session.id,
    preguntas: session.preguntas ?? [],
    respuestas: respuestas.map((r) => ({
      ave_id: r.ave_id,
      respuesta_usuario: r.respuesta_usuario,
      es_correcta: r.es_correcta,
      puntos_obtenidos: r.puntos_obtenidos,
      bonus_racha: r.bonus_racha,
    })),
    streak_actual: session.streak_actual,
    puntos_totales: respuestas.reduce((suma, r) => suma + puntosDe(r), 0),
  };
}

export default getActiveSession;
