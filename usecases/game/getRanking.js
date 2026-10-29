import buildRanking from "./buildRanking.js";

/**
 * Caso de Uso: Ranking de los mejores jugadores (los `limit` primeros).
 */
async function getRanking({ limit }, { usersDao, gameResultsDao }) {
  const users = await usersDao.getAll();
  const respuestas = await gameResultsDao.getAll();

  const ranking = buildRanking(users, respuestas).slice(0, limit);

  return { total_jugadores: ranking.length, ranking };
}

export default getRanking;
