import EVENTS from "../../events/eventNames.js";
import { resumirRespuestas } from "./gameRules.js";

/**
 * Termina una partida: calcula el resumen con sus respuestas y la marca como "terminada".
 * La usan terminar partida (finishGame) e iniciar partida (startGame, para cerrar la anterior).
 * Efecto secundario desacoplado: emite "game.finished".
 */
async function closeSession(session, { gameSessionsDao, gameResultsDao, events }) {
  const respuestas = await gameResultsDao.getBySession(session.id);
  const resumen = resumirRespuestas(respuestas);

  await gameSessionsDao.update(session.id, {
    estado: "terminada",
    terminadaAt: Date.now(),
    puntos_totales: resumen.puntos_totales,
    total_intentos: resumen.total_intentos,
    total_aciertos: resumen.total_aciertos,
  });

  events.emit(EVENTS.GAME_FINISHED, {
    userId: session.user_id,
    sessionId: session.id,
    puntos: resumen.puntos_totales,
    aciertos: resumen.total_aciertos,
    intentos: resumen.total_intentos,
  });

  return { session_id: session.id, ...resumen };
}

export default closeSession;
