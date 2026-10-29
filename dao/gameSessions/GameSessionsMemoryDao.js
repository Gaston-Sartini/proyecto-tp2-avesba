/**
 * Adaptador DAO en memoria para Partidas (sesiones de juego).
 * Respeta la misma interfaz pública que GameSessionsSequelizeDao.
 */
// Mismos valores por defecto que GameSessionModel (así los dos DAOs devuelven lo mismo)
const DEFAULTS = {
  estado: "activa",
  preguntas: null,
  place_id: null,
  locale: null,
  streak_actual: 0,
  streak_maximo: 0,
  puntos_totales: 0,
  total_intentos: 0,
  total_aciertos: 0,
  terminadaAt: null,
};

class GameSessionsMemoryDao {
  #sessions = [];
  #nextId = 1;

  // Copia profunda: el lote de preguntas es un array de objetos y no queremos que
  // quien lo reciba pueda modificar sin querer lo que está guardado acá
  #copy(session) {
    return structuredClone(session);
  }

  async create(data) {
    const { id: _ignored, ...sessionData } = data;
    const newSession = { id: this.#nextId++, ...DEFAULTS, ...structuredClone(sessionData) };
    this.#sessions.push(newSession);
    return this.#copy(newSession);
  }

  async getById(id) {
    const session = this.#sessions.find((s) => s.id === Number(id));
    return session ? this.#copy(session) : null;
  }

  // La partida activa del usuario (o null). Cada usuario tiene como máximo una.
  async getActiveByUser(userId) {
    const session = this.#sessions.find((s) => s.user_id === Number(userId) && s.estado === "activa");
    return session ? this.#copy(session) : null;
  }

  // Todas las partidas activas del usuario (para cerrarlas antes de iniciar una nueva)
  async getAllActiveByUser(userId) {
    return this.#sessions
      .filter((s) => s.user_id === Number(userId) && s.estado === "activa")
      .map((s) => this.#copy(s));
  }

  async update(id, changes) {
    const index = this.#sessions.findIndex((s) => s.id === Number(id));
    if (index === -1) return null;

    const { id: _ignored, ...allowedChanges } = changes;
    this.#sessions[index] = { ...this.#sessions[index], ...structuredClone(allowedChanges) };
    return this.#copy(this.#sessions[index]);
  }

  // Borra todas las partidas de un usuario. Devuelve cuántas borró.
  async deleteByUser(userId) {
    const antes = this.#sessions.length;
    this.#sessions = this.#sessions.filter((s) => s.user_id !== Number(userId));
    return antes - this.#sessions.length;
  }
}

export default GameSessionsMemoryDao;
