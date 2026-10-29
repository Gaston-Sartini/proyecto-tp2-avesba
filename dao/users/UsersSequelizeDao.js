import { UserModel } from "../models/index.js";
import { initDatabase } from "../../connection/index.js";

// Columnas pedidas explícitamente (sin SELECT *): NO incluye passwordHash
const USER_ATTRIBUTES = ["id", "nombre", "apellido", "email", "role", "is_active", "createdAt", "updatedAt", "lastLogin"];

/**
 * Adaptador DAO para Usuarios utilizando Sequelize (SQL).
 * Debe respetar exactamente la misma interfaz (mismos métodos públicos) que UsersMemoryDao.
 */
class UsersSequelizeDao {
  // Prepara la base y crea las tablas que falten (ver connection/sequelize.js)
  async init() {
    await initDatabase();
  }

  // Arma el WHERE solo con los filtros que vinieron
  #where({ role, is_active } = {}) {
    const where = {};
    if (role !== undefined) where.role = role;
    if (is_active !== undefined) where.is_active = is_active;
    return where;
  }

  // filters: { role, is_active, page, limit } — el filtro y la paginación los resuelve la BD
  async getAll({ role, is_active, page = 1, limit } = {}) {
    const users = await UserModel.findAll({
      where: this.#where({ role, is_active }),
      attributes: USER_ATTRIBUTES,
      order: [["id", "ASC"]],
      ...(limit && { limit, offset: (page - 1) * limit }),
    });
    return users.map((u) => u.get({ plain: true }));
  }

  async count({ role, is_active } = {}) {
    return UserModel.count({ where: this.#where({ role, is_active }) });
  }

  async getById(id) {
    const user = await UserModel.findByPk(id, { attributes: USER_ATTRIBUTES });
    return user ? user.get({ plain: true }) : null;
  }

  async getByEmail(email) {
    const user = await UserModel.findOne({ where: { email }, attributes: USER_ATTRIBUTES });
    return user ? user.get({ plain: true }) : null;
  }

  // Credenciales para el login: es el ÚNICO método que devuelve el hash de la contraseña
  async getCredentialsByEmail(email) {
    const user = await UserModel.findOne({
      where: { email },
      attributes: [...USER_ATTRIBUTES, "passwordHash"],
    });
    return user ? user.get({ plain: true }) : null;
  }

  async save(data) {
    // Ignoramos el id si viene provisto, la BD asigna uno
    const { id: _ignored, ...userData } = data;
    const created = await UserModel.create(userData);
    return this.getById(created.id);
  }

  async update(id, changes) {
    const user = await UserModel.findByPk(id);
    if (!user) return null;

    const { id: _ignored, ...allowedChanges } = changes;
    await user.update(allowedChanges);
    return this.getById(id);
  }
}

export default UsersSequelizeDao;
