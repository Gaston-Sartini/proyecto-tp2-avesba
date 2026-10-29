import fetchQuestions from "./fetchQuestions.js";
import closeSession from "./closeSession.js";

/**
 * Caso de Uso: Iniciar una partida.
 * Pasos:
 *  1. Trae las aves y arma el lote de 10 preguntas. Si iNaturalist falla, corta acá (503)
 *     y NO se crea la partida ni se cierra la anterior.
 *  2. Si el jugador tenía partidas activas, las termina (guarda su puntaje).
 *  3. Crea la partida nueva guardando el lote: las respuestas se validan contra ese lote,
 *     así el cliente no puede hacer trampa mandando otro nombre de ave.
 */
async function startGame({ place_id, locale }, actor, deps) {
  const { gameSessionsDao, birdsProvider } = deps;

  const preguntas = await fetchQuestions({ place_id, locale }, birdsProvider);

  const activas = await gameSessionsDao.getAllActiveByUser(actor.id);
  for (const anterior of activas) {
    await closeSession(anterior, deps);
  }

  // Devuelve la partida creada: /juego/iniciar responde solo { session_id, mensaje } y POST /partidas, la partida completa
  return gameSessionsDao.create({
    user_id: actor.id,
    estado: "activa",
    preguntas,
    place_id,
    locale,
    streak_actual: 0,
    streak_maximo: 0,
    puntos_totales: 0,
    total_intentos: 0,
    total_aciertos: 0,
    createdAt: Date.now(),
    terminadaAt: null,
  });
}

export default startGame;
