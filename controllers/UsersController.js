/**
 * Controlador de Usuarios.
 * Recibe los casos de uso por inyección de dependencias; no conoce ningún DAO.
 * `req.user` ({ id, role }) lo deja el middleware authenticate: se pasa a los casos de uso como "actor".
 */
class UsersController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // GET /users/me
  me = async (req, res) => {
    res.json(await this.#useCases.getProfile(req.user));
  };

  // PATCH /users/me/password
  changeMyPassword = async (req, res) => {
    res.json(await this.#useCases.changePassword(req.user, req.body));
  };

  // GET /users?page=&per_page=&role=
  list = async (req, res) => {
    res.json(await this.#useCases.listUsers(req.query));
  };

  // GET /users/:id
  get = async (req, res) => {
    res.json(await this.#useCases.getUserById(req.params.id, req.user));
  };

  // PATCH /users/:id
  update = async (req, res) => {
    res.json(await this.#useCases.updateUser(req.params.id, req.body));
  };

  // POST /users/:id/reset-password
  resetPassword = async (req, res) => {
    res.json(await this.#useCases.resetPassword(req.params.id));
  };
}

export default UsersController;
