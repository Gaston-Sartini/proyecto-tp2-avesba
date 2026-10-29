import AppError from "../../errors/AppError.js";

// En el listado no mandamos el lote de preguntas: es pesado y para el resumen no hace falta
const sinPreguntas = ({ preguntas: _preguntas, ...resumen }) => resumen;

/**
 * Caso de Uso: Listar partidas con filtros (usuario y estado), orden y paginación.
 * Regla por dueño: un jugador siempre ve solo las suyas; si pide las de otro, 403.
 */
async function listPartidas({ user_id, estado, sort, page, per_page }, actor, { gameSessionsDao }) {
  if (actor.role === "jugador") {
    if (user_id !== undefined && user_id !== actor.id) {
      throw new AppError("FORBIDDEN", "Solo podés ver tus propias partidas", 403);
    }
    user_id = actor.id;
  }

  const items = await gameSessionsDao.getAll({ user_id, estado, sort, page, limit: per_page });
  const total = await gameSessionsDao.count({ user_id, estado });

  return {
    items: items.map(sinPreguntas),
    total,
    page,
    per_page,
    pages: Math.ceil(total / per_page),
  };
}

export default listPartidas;
