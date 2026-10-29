import EVENTS from "../../events/eventNames.js";

/**
 * Caso de Uso: Registrar cuánto tiempo estuvo conectado un jugador.
 * No guarda nada: solo avisa que pasó (evento "user.disconnected") y quien escuche decide qué hacer
 * (hoy, el notificador lo escribe en la consola o en notifications.log).
 */
async function logConnection({ userId, tiempoConectado }, { events }) {
  events.emit(EVENTS.USER_DISCONNECTED, { userId, tiempoConectado });
}

export default logConnection;
