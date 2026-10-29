import { puntosDe } from "./gameRules.js";

/**
 * Arma el ranking completo a partir de los usuarios y TODAS las respuestas.
 * Función pura: la usan el ranking y las métricas del jugador (para saber su posición).
 * Incluye a los usuarios que todavía no jugaron (con 0 puntos), igual que el backend de Python.
 * Orden: más puntos primero; si empatan, más aciertos; si siguen empatados, el usuario más viejo.
 */
function buildRanking(users, respuestas) {
  // Acumulamos por usuario: { puntos, aciertos, intentos }
  const porUsuario = new Map();
  for (const r of respuestas) {
    const acumulado = porUsuario.get(r.user_id) ?? { puntos: 0, aciertos: 0, intentos: 0 };
    acumulado.puntos += puntosDe(r);
    acumulado.aciertos += r.es_correcta ? 1 : 0;
    acumulado.intentos += 1;
    porUsuario.set(r.user_id, acumulado);
  }

  return users
    .map((user) => {
      const { puntos, aciertos, intentos } = porUsuario.get(user.id) ?? { puntos: 0, aciertos: 0, intentos: 0 };
      return {
        user_id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        puntos_totales: puntos,
        aciertos,
        fallos: intentos - aciertos,
      };
    })
    .sort((a, b) => b.puntos_totales - a.puntos_totales || b.aciertos - a.aciertos || a.user_id - b.user_id);
}

export default buildRanking;
