/**
 * Nombres de eventos de la aplicación.
 * Son el contrato entre quien emite y quien escucha: se centralizan para no depender de strings sueltos.
 * Convención: "entidad.hecho" (algo que YA ocurrió, no una orden).
 */
const EVENTS = {
  USER_REGISTERED: "user.registered", // se registró un jugador nuevo
  GAME_FINISHED: "game.finished", // terminó una partida
  STREAK_ACHIEVED: "game.streakAchieved", // el jugador logró una racha con bonus (3, 5 o 10+)
  USER_DISCONNECTED: "user.disconnected", // el jugador cerró la pestaña (con el tiempo que estuvo conectado)
};

export default EVENTS;
