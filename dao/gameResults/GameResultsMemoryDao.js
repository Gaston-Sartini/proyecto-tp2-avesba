/**
 * Adaptador DAO en memoria para Respuestas (resultado de cada pregunta).
 * Respeta la misma interfaz pública que GameResultsSequelizeDao.
 */
// Mismos valores por defecto que GameResultModel (así los dos DAOs devuelven lo mismo)
const DEFAULTS = { puntos_obtenidos: 0, bonus_racha: 0, streak_en_respuesta: 0 };

class GameResultsMemoryDao {
  #results = [];
  #nextId = 1;

  async save(data) {
    const { id: _ignored, ...resultData } = data;
    const newResult = { id: this.#nextId++, ...DEFAULTS, ...resultData };
    this.#results.push(newResult);
    return { ...newResult };
  }

  // Guarda varias respuestas juntas (lo usa la carga de datos de prueba)
  async saveMany(list) {
    const saved = [];
    for (const data of list) saved.push(await this.save(data));
    return saved;
  }

  // Respuestas de una partida, en el orden en que se respondieron
  async getBySession(sessionId) {
    return this.#results
      .filter((r) => r.session_id === Number(sessionId))
      .sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)
      .map((r) => ({ ...r }));
  }

  // La respuesta a esa ave dentro de esa partida (o null): sirve para no responder dos veces
  async findInSession(sessionId, aveId) {
    const result = this.#results.find((r) => r.session_id === Number(sessionId) && r.ave_id === Number(aveId));
    return result ? { ...result } : null;
  }

  // filters: { user_id } — sin filtros devuelve todas (ranking y métricas globales)
  async getAll({ user_id } = {}) {
    return this.#results
      .filter((r) => user_id === undefined || r.user_id === Number(user_id))
      .map((r) => ({ ...r }));
  }
}

export default GameResultsMemoryDao;
