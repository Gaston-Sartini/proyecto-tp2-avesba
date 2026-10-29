import AppError from "../../errors/AppError.js";
import buildRanking from "../game/buildRanking.js";
import { resumirRespuestas } from "../game/gameRules.js";

/**
 * Caso de Uso: Mis métricas (las del jugador logueado).
 * Intentos, aciertos y puntos de TODAS sus partidas, y su posición en el ranking general.
 */
async function getUserMetrics(actor, { usersDao, gameResultsDao }) {
  const user = await usersDao.getById(actor.id);
  if (!user) {
    throw new AppError("USER_NOT_FOUND", `Usuario ${actor.id} no encontrado`, 404);
  }

  const todas = await gameResultsDao.getAll();
  const mias = todas.filter((r) => r.user_id === user.id);
  const { puntos_totales, total_intentos, total_aciertos, porcentaje_acierto } = resumirRespuestas(mias);

  // La posición sale del mismo ranking que ve todo el mundo
  const ranking = buildRanking(await usersDao.getAll(), todas);
  const posicion = ranking.findIndex((jugador) => jugador.user_id === user.id) + 1;

  return {
    user_id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    total_intentos,
    total_aciertos,
    porcentaje_acierto,
    puntuacion_total: puntos_totales,
    posicion_ranking: posicion || 1,
  };
}

export default getUserMetrics;
