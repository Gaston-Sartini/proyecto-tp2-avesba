import { porcentaje } from "../game/gameRules.js";

/**
 * Caso de Uso: Métricas globales del sistema (solo admins y moderadores, lo controla el router).
 * Cuántos jugadores jugaron, cuántas respuestas hay, el % de acierto general,
 * y el ave más fácil y la más difícil (la de mayor y menor % de acierto).
 */
async function getGlobalMetrics({ gameResultsDao }) {
  const respuestas = await gameResultsDao.getAll();

  const totalAciertos = respuestas.filter((r) => r.es_correcta).length;

  // Agrupamos las respuestas por ave: { id, nombre, total, aciertos }
  const porAve = new Map();
  for (const r of respuestas) {
    const ave = porAve.get(r.ave_id) ?? { id: r.ave_id, nombre: r.ave_nombre, total: 0, aciertos: 0 };
    ave.total += 1;
    ave.aciertos += r.es_correcta ? 1 : 0;
    porAve.set(r.ave_id, ave);
  }

  const aves = [...porAve.values()].map((ave) => ({
    id: ave.id,
    nombre: ave.nombre,
    total_intentos: ave.total,
    total_aciertos: ave.aciertos,
    porcentaje_acierto: porcentaje(ave.aciertos, ave.total),
  }));

  // Si todavía nadie jugó, no hay ave más ni menos acertada
  const masAcertada = aves.reduce((mejor, ave) => (!mejor || ave.porcentaje_acierto > mejor.porcentaje_acierto ? ave : mejor), null);
  const menosAcertada = aves.reduce((peor, ave) => (!peor || ave.porcentaje_acierto < peor.porcentaje_acierto ? ave : peor), null);

  return {
    total_jugadores_activos: new Set(respuestas.map((r) => r.user_id)).size,
    total_intentos_sistema: respuestas.length,
    porcentaje_acierto_global: porcentaje(totalAciertos, respuestas.length),
    ave_mas_acertada: masAcertada,
    ave_menos_acertada: menosAcertada,
  };
}

export default getGlobalMetrics;
