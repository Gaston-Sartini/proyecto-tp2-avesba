import AppError from "../../errors/AppError.js";
import EVENTS from "../../events/eventNames.js";
import { evaluarRespuesta, calcularBonusRacha, armarMensaje } from "./gameRules.js";

/**
 * Caso de Uso: Responder una pregunta.
 * Reglas de negocio (en este orden):
 *  1. Tiene que haber una partida activa.
 *  2. No se puede responder dos veces la misma ave en la misma partida.
 *  3. La partida tiene que tener lote (las partidas viejas sin lote no se pueden validar).
 *  4. El ave tiene que pertenecer al lote de la partida.
 *  5. El nombre correcto sale del LOTE, nunca del cliente (si lo mandara, podría hacer trampa).
 *  6. La racha sube con cada acierto y vuelve a 0 con un error. A los 3, 5 y 10+ aciertos seguidos hay bonus.
 * Efecto secundario desacoplado: si hubo bonus, emite "game.streakAchieved".
 */
async function answerQuestion({ ave_id, respuesta_usuario }, actor, { gameSessionsDao, gameResultsDao, events }) {
  const session = await gameSessionsDao.getActiveByUser(actor.id);
  if (!session) {
    throw new AppError("NO_ACTIVE_SESSION", "No hay una sesión activa. Iniciá una con POST /juego/iniciar", 404);
  }

  const yaRespondida = await gameResultsDao.findInSession(session.id, ave_id);
  if (yaRespondida) {
    throw new AppError("ALREADY_ANSWERED", "Ya respondiste esta pregunta en esta sesión", 400);
  }

  if (!session.preguntas) {
    throw new AppError("SESSION_WITHOUT_BATCH", "Esta sesión no tiene lote de preguntas. Terminala e iniciá una nueva", 409);
  }

  const pregunta = session.preguntas.find((p) => p.id === ave_id);
  if (!pregunta) {
    throw new AppError("BIRD_NOT_IN_BATCH", "El ave no pertenece al lote de la sesión", 400);
  }

  const { esCorrecta, puntos } = evaluarRespuesta(respuesta_usuario, pregunta.nombre);

  // Racha: sube con cada acierto, se corta con un error
  const racha = esCorrecta ? session.streak_actual + 1 : 0;
  const rachaMaxima = Math.max(session.streak_maximo, racha);
  const bonus = esCorrecta ? calcularBonusRacha(racha) : 0;

  await gameResultsDao.save({
    user_id: actor.id,
    session_id: session.id,
    ave_id,
    ave_nombre: pregunta.nombre,
    respuesta_usuario,
    es_correcta: esCorrecta,
    puntos_obtenidos: puntos,
    bonus_racha: bonus,
    streak_en_respuesta: racha,
    createdAt: Date.now(),
  });

  await gameSessionsDao.update(session.id, { streak_actual: racha, streak_maximo: rachaMaxima });

  if (bonus > 0) {
    events.emit(EVENTS.STREAK_ACHIEVED, { userId: actor.id, sessionId: session.id, racha, bonus });
  }

  return {
    es_correcta: esCorrecta,
    puntos_obtenidos: puntos + bonus,
    mensaje: armarMensaje(esCorrecta, racha, bonus),
  };
}

export default answerQuestion;
