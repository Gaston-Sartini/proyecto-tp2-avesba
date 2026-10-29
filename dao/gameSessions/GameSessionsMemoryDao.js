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

  #filter({ user_id, estado } = {}) {
    return this.#sessions.filter(
      (s) => (user_id === undefined || s.user_id === Number(user_id)) && (estado === undefined || s.estado === estado)
    );
  }

  // Lista partidas con filtros, orden y paginación (el equivalente en memoria del WHERE/ORDER BY/LIMIT de SQL)
  // filters: { user_id, estado, sort ("createdAt" | "-puntos_totales" ...), page, limit }
  async getAll({ user_id, estado, sort = "-createdAt", page = 1, limit } = {}) {
    const desc = sort.startsWith("-");
    const field = desc ? sort.slice(1) : sort;

    let sessions = this.#filter({ user_id, estado }).sort((a, b) => {
      if (a[field] === b[field]) return a.id - b.id;
      return (a[field] < b[field] ? -1 : 1) * (desc ? -1 : 1);
    });
    if (limit) sessions = sessions.slice((page - 1) * limit, page * limit);

    return sessions.map((s) => this.#copy(s));
  }

  async count({ user_id, estado } = {}) {
    return this.#filter({ user_id, estado }).length;
  }

  // Devuelve true si la borró, false si no existía
  async delete(id) {
    const index = this.#sessions.findIndex((s) => s.id === Number(id));
    if (index === -1) return false;

    this.#sessions.splice(index, 1);
    return true;
  }

  // Borra todas las partidas de un usuario. Devuelve cuántas borró.
  async deleteByUser(userId) {
    const antes = this.#sessions.length;
    this.#sessions = this.#sessions.filter((s) => s.user_id !== Number(userId));
    return antes - this.#sessions.length;
  }
}

export default GameSessionsMemoryDao;
