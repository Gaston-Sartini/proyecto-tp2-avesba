/**
 * Adaptador DAO en memoria para Usuarios.
 * Respeta la misma interfaz pública que UsersSequelizeDao.
 * Arranca vacío: el admin y los jugadores de prueba los siembra el contenedor.
 */
class UsersMemoryDao {
  #users = [];
  #nextId = 1;

  // Quita el hash: ningún método devuelve passwordHash salvo getCredentialsByEmail
  #toPublic(user) {
    const { passwordHash: _hash, ...publicUser } = user;
    return { ...publicUser };
  }

  #filter({ role, is_active } = {}) {
    return this.#users.filter(
      (u) => (role === undefined || u.role === role) && (is_active === undefined || u.is_active === is_active)
    );
  }

  // filters: { role, is_active, page, limit }
  async getAll({ role, is_active, page = 1, limit } = {}) {
    let users = this.#filter({ role, is_active });
    if (limit) users = users.slice((page - 1) * limit, page * limit);
    return users.map((u) => this.#toPublic(u));
  }

  // Cantidad de usuarios que cumplen los filtros (para armar la paginación)
  async count({ role, is_active } = {}) {
    return this.#filter({ role, is_active }).length;
  }

  async getById(id) {
    const user = this.#users.find((u) => u.id === Number(id));
    return user ? this.#toPublic(user) : null;
  }

  async getByEmail(email) {
    const user = this.#users.find((u) => u.email === email);
    return user ? this.#toPublic(user) : null;
  }

  // Credenciales para el login: es el ÚNICO método que devuelve el hash de la contraseña
  async getCredentialsByEmail(email) {
    const user = this.#users.find((u) => u.email === email);
    return user ? { ...user } : null;
  }

  async save(data) {
    const { id: _ignored, ...userData } = data;
    // Mismos valores por defecto que UserModel (así los dos DAOs devuelven lo mismo)
    const newUser = { id: this.#nextId++, role: "jugador", is_active: true, lastLogin: null, ...userData };
    this.#users.push(newUser);
    return this.#toPublic(newUser);
  }

  async update(id, changes) {
    const index = this.#users.findIndex((u) => u.id === Number(id));
    if (index === -1) return null;

    const { id: _ignored, ...allowedChanges } = changes;
    this.#users[index] = { ...this.#users[index], ...allowedChanges };
    return this.#toPublic(this.#users[index]);
  }
}

// Exportamos la clase: la factory (daoFactory.js) crea la instancia
export default UsersMemoryDao;
