import AppError from "../../errors/AppError.js";
import closeSession from "../game/closeSession.js";
import assertCanAccess from "./assertCanAccess.js";

/**
 * Caso de Uso: Actualizar una partida. Lo único que se puede cambiar es el estado a "terminada"
 * (el puntaje y las respuestas los calcula el juego, no se editan a mano).
 * Reglas de negocio:
 *  - La partida tiene que existir y ser del jugador (o ser admin/moderador).
 *  - Una partida ya terminada no se puede volver a terminar (409).
 */
async function finishPartida(id, actor, deps) {
  const partida = await deps.gameSessionsDao.getById(id);
  if (!partida) {
    throw new AppError("PARTIDA_NOT_FOUND", `No existe una partida con id ${id}`, 404);
  }
  assertCanAccess(partida, actor);

  if (partida.estado !== "activa") {
    throw new AppError("PARTIDA_ALREADY_FINISHED", "La partida ya está terminada", 409);
  }

  await closeSession(partida, deps);
  return deps.gameSessionsDao.getById(id);
}

export default finishPartida;
