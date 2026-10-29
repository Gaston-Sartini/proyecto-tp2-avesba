import listPartidas from "./listPartidas.js";
import getPartida from "./getPartida.js";
import finishPartida from "./finishPartida.js";
import deletePartida from "./deletePartida.js";
import startGame from "../game/startGame.js";

/**
 * Factory de Casos de Uso de Partidas (el CRUD de la entidad Partida).
 * Crear una partida es lo mismo que iniciar el juego: reutiliza startGame.
 */
function makePartidaUseCases({ gameSessionsDao, gameResultsDao, birdsProvider, events }) {
  const deps = { gameSessionsDao, gameResultsDao, birdsProvider, events };

  return {
    listPartidas: (filters, actor) => listPartidas(filters, actor, deps),
    getPartida: (id, actor) => getPartida(id, actor, deps),
    createPartida: (options, actor) => startGame(options, actor, deps),
    finishPartida: (id, actor) => finishPartida(id, actor, deps),
    deletePartida: (id) => deletePartida(id, deps),
  };
}

export default makePartidaUseCases;
