import { GameResultModel } from "../models/index.js";
import { initDatabase } from "../../connection/index.js";

const RESULT_ATTRIBUTES = [
  "id",
  "user_id",
  "session_id",
  "ave_id",
  "ave_nombre",
  "respuesta_usuario",
  "es_correcta",
  "puntos_obtenidos",
  "bonus_racha",
  "streak_en_respuesta",
  "createdAt",
];

/**
 * Adaptador DAO para Respuestas utilizando Sequelize (SQL).
 * Debe respetar la misma interfaz pública que GameResultsMemoryDao.
 */
class GameResultsSequelizeDao {
  async init() {
    await initDatabase();
  }

  async save(data) {
    const { id: _ignored, ...resultData } = data;
    const created = await GameResultModel.create(resultData);
    return created.get({ plain: true });
  }

  // bulkCreate: un solo INSERT con muchas filas (mucho más rápido que de a una)
  async saveMany(list) {
    const rows = list.map(({ id: _ignored, ...resultData }) => resultData);
    const created = await GameResultModel.bulkCreate(rows);
    return created.map((r) => r.get({ plain: true }));
  }

  async getBySession(sessionId) {
    const results = await GameResultModel.findAll({
      where: { session_id: sessionId },
      attributes: RESULT_ATTRIBUTES,
      order: [
        ["createdAt", "ASC"],
        ["id", "ASC"],
      ],
    });
    return results.map((r) => r.get({ plain: true }));
  }

  async findInSession(sessionId, aveId) {
    const result = await GameResultModel.findOne({
      where: { session_id: sessionId, ave_id: aveId },
      attributes: RESULT_ATTRIBUTES,
    });
    return result ? result.get({ plain: true }) : null;
  }

  async getAll({ user_id } = {}) {
    const results = await GameResultModel.findAll({
      where: user_id === undefined ? {} : { user_id },
      attributes: RESULT_ATTRIBUTES,
      order: [["id", "ASC"]],
    });
    return results.map((r) => r.get({ plain: true }));
  }

  // Borra todas las respuestas de una partida. Devuelve cuántas borró.
  async deleteBySession(sessionId) {
    return GameResultModel.destroy({ where: { session_id: sessionId } });
  }

  // Borra todas las respuestas de un usuario. Devuelve cuántas borró.
  async deleteByUser(userId) {
    return GameResultModel.destroy({ where: { user_id: userId } });
  }
}

export default GameResultsSequelizeDao;
