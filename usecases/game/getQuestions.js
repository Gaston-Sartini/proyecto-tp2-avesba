import fetchQuestions from "./fetchQuestions.js";

/**
 * Caso de Uso: Obtener las preguntas del juego.
 * - Si el jugador tiene una partida activa con lote, devuelve SIEMPRE ese mismo lote
 *   (aunque recargue la página, las preguntas no cambian).
 * - Si no, arma un lote nuevo (que no se guarda: para jugar en serio hay que iniciar la partida).
 */
async function getQuestions({ place_id, locale }, actor, { gameSessionsDao, birdsProvider }) {
  const session = await gameSessionsDao.getActiveByUser(actor.id);
  if (session?.preguntas) {
    return { total: session.preguntas.length, preguntas: session.preguntas };
  }

  const preguntas = await fetchQuestions({ place_id, locale }, birdsProvider);
  return { total: preguntas.length, preguntas };
}

export default getQuestions;
