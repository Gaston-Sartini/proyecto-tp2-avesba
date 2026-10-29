import { PERSISTENCE_TYPE } from "../config/config.js";
import UsersMemoryDao from "./users/UsersMemoryDao.js";
import UsersSequelizeDao from "./users/UsersSequelizeDao.js";
import GameSessionsMemoryDao from "./gameSessions/GameSessionsMemoryDao.js";
import GameSessionsSequelizeDao from "./gameSessions/GameSessionsSequelizeDao.js";
import GameResultsMemoryDao from "./gameResults/GameResultsMemoryDao.js";
import GameResultsSequelizeDao from "./gameResults/GameResultsSequelizeDao.js";

/**
 * Factory de DAOs.
 * Devuelve el DAO correcto según PERSISTENCE_TYPE ("memory" o "sequelize").
 * Crea una instancia nueva en cada llamada: el contenedor la pide una sola vez al arrancar,
 * y así cada app que arman los tests empieza con los datos vacíos.
 */
const usingSequelize = () => PERSISTENCE_TYPE === "sequelize";

function getUsersDao() {
  console.log(`[Persistencia] Usando ${usingSequelize() ? "Sequelize (SQLite)" : "Memoria (Array JS)"}`);
  return usingSequelize() ? new UsersSequelizeDao() : new UsersMemoryDao();
}

function getGameSessionsDao() {
  return usingSequelize() ? new GameSessionsSequelizeDao() : new GameSessionsMemoryDao();
}

function getGameResultsDao() {
  return usingSequelize() ? new GameResultsSequelizeDao() : new GameResultsMemoryDao();
}

export { getUsersDao, getGameSessionsDao, getGameResultsDao };
