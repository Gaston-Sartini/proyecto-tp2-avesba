import getUserMetrics from "./getUserMetrics.js";
import getGlobalMetrics from "./getGlobalMetrics.js";

/**
 * Factory de Casos de Uso de Métricas.
 */
function makeMetricsUseCases({ usersDao, gameResultsDao }) {
  return {
    getUserMetrics: (actor) => getUserMetrics(actor, { usersDao, gameResultsDao }),
    getGlobalMetrics: () => getGlobalMetrics({ gameResultsDao }),
  };
}

export default makeMetricsUseCases;
