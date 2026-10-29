import AppError from "../../errors/AppError.js";

/**
 * Regla de autorización por dueño: un "jugador" solo puede ver y operar SUS partidas.
 * Moderadores y admins pueden ver las de todos.
 * Va en el caso de uso (y no en el router con authorize) porque depende de A QUIÉN pertenece la partida.
 */
function assertCanAccess(partida, actor) {
  if (actor.role === "jugador" && partida.user_id !== actor.id) {
    throw new AppError("FORBIDDEN", "No tenés permiso para ver esta partida", 403);
  }
}

export default assertCanAccess;
