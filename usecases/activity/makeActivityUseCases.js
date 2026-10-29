import logConnection from "./logConnection.js";

/**
 * Factory de Casos de Uso de Actividad.
 */
function makeActivityUseCases({ events }) {
  return {
    logConnection: (data) => logConnection(data, { events }),
  };
}

export default makeActivityUseCases;
