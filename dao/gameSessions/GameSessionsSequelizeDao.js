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

  #where({ user_id, estado } = {}) {
    const where = {};
    if (user_id !== undefined) where.user_id = user_id;
    if (estado !== undefined) where.estado = estado;
    return where;
  }

  // Lista partidas: el filtro, el orden y la paginación los resuelve la BD (WHERE / ORDER BY / LIMIT)
  // filters: { user_id, estado, sort ("createdAt" | "-puntos_totales" ...), page, limit }
  async getAll({ user_id, estado, sort = "-createdAt", page = 1, limit } = {}) {
    const sessions = await GameSessionModel.findAll({
      where: this.#where({ user_id, estado }),
      attributes: SESSION_ATTRIBUTES,
      order: [
        [sort.replace(/^-/, ""), sort.startsWith("-") ? "DESC" : "ASC"],
        ["id", "ASC"], // desempate: mismo orden que el DAO en memoria
      ],
      ...(limit && { limit, offset: (page - 1) * limit }),
    });
    return sessions.map((s) => s.get({ plain: true }));
  }

  async count({ user_id, estado } = {}) {
    return GameSessionModel.count({ where: this.#where({ user_id, estado }) });
  }

  // Devuelve true si la borró, false si no existía
  async delete(id) {
    const deletedCount = await GameSessionModel.destroy({ where: { id } });
    return deletedCount > 0;
  }

  // Borra todas las partidas de un usuario. Devuelve cuántas borró.
  async deleteByUser(userId) {
    return GameSessionModel.destroy({ where: { user_id: userId } });
  }
}

export default GameSessionsSequelizeDao;
