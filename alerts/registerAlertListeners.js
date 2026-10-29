import EVENTS from "../events/eventNames.js";

/**
 * Módulo de alertas: decide qué hacer cuando ocurre un evento.
 * No conoce al emisor (los casos de uso) ni el canal concreto (el notifier se inyecta).
 */
function registerAlertListeners(bus, notifier) {
  // Envuelve cada aviso: un fallo en la notificación NO debe afectar al caso de uso que emitió el evento
  const notify = async (message) => {
    try {
      await notifier.notify(message);
    } catch (err) {
      console.error("[alertas] No se pudo notificar:", err.message);
    }
  };

  bus.on(EVENTS.USER_REGISTERED, ({ nombre, apellido, email }) =>
    notify({ subject: "Bienvenida", body: `Se registró ${nombre} ${apellido} <${email}>` })
  );

  bus.on(EVENTS.GAME_FINISHED, ({ userId, puntos, aciertos, intentos }) =>
    notify({
      subject: "Partida terminada",
      body: `El usuario ${userId} hizo ${puntos} puntos (${aciertos}/${intentos} aciertos)`,
    })
  );

  bus.on(EVENTS.STREAK_ACHIEVED, ({ userId, racha, bonus }) =>
    notify({ subject: "Racha", body: `El usuario ${userId} lleva ${racha} aciertos seguidos (+${bonus} pts de bonus)` })
  );

  bus.on(EVENTS.USER_DISCONNECTED, ({ userId, tiempoConectado }) =>
    notify({
      subject: "Desconexión",
      body: `${userId ? `El usuario ${userId}` : "Un visitante"} estuvo conectado ${Math.round(tiempoConectado / 1000)} segundos`,
    })
  );
}

export default registerAlertListeners;
