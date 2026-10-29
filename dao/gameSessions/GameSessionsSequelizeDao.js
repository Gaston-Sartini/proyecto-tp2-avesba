import { GameSessionModel } from "../models/index.js";
import { initDatabase } from "../../connection/index.js";

const SESSION_ATTRIBUTES = [
  "id",
  "user_id",
  "estado",
  "preguntas",
  "place_id",
  "locale",
  "streak_actual",
  "streak_maximo",
  "puntos_totales",
  "total_intentos",
  "total_aciertos",
  "createdAt",
  "terminadaAt",
];

/**
 * Adaptador DAO para Partidas (sesiones de juego) utilizando Sequelize (SQL).
 * Debe respetar la misma interfaz pública que GameSessionsMemoryDao.
 */
class GameSessionsSequelizeDao {
  async init() {
    await initDatabase();
  }

  async create(data) {
    const { id: _ignored, ...sessionData } = data;
    const created = await GameSessionModel.create(sessionData);
    return this.getById(created.id);
  }

  async getById(id) {
    const session = await GameSessionModel.findByPk(id, { attributes: SESSION_ATTRIBUTES });
    return session ? session.get({ plain: true }) : null;
  }

  async getActiveByUser(userId) {
    const session = await GameSessionModel.findOne({
      where: { user_id: userId, estado: "activa" },
      attributes: SESSION_ATTRIBUTES,
      order: [["id", "ASC"]],
    });
    return session ? session.get({ plain: true }) : null;
  }

  async getAllActiveByUser(userId) {
    const sessions = await GameSessionModel.findAll({
      where: { user_id: userId, estado: "activa" },
      attributes: SESSION_ATTRIBUTES,
      order: [["id", "ASC"]],
    });
    return sessions.map((s) => s.get({ plain: true }));
  }

  async update(id, changes) {
    const session = await GameSessionModel.findByPk(id);
    if (!session) return null;

    const { id: _ignored, ...allowedChanges } = changes;
    await session.update(allowedChanges);
    return this.getById(id);
  }

  // Borra todas las partidas de un usuario. Devuelve cuántas borró.
  async deleteByUser(userId) {
    return GameSessionModel.destroy({ where: { user_id: userId } });
  }
}

export default GameSessionsSequelizeDao;
