/**
 * Controlador de Partidas (el CRUD de la entidad).
 * Recibe los casos de uso por inyección de dependencias; no conoce ningún DAO.
 */
class PartidasController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // GET /partidas?user_id=&estado=&sort=&page=&per_page=
  list = async (req, res) => {
    res.json(await this.#useCases.listPartidas(req.query, req.user));
  };

  // GET /partidas/:id — con sus respuestas
  get = async (req, res) => {
    res.json(await this.#useCases.getPartida(req.params.id, req.user));
  };

  // POST /partidas — 201: se creó la partida
  create = async (req, res) => {
    res.status(201).json(await this.#useCases.createPartida(req.body, req.user));
  };

  // PATCH /partidas/:id — terminar la partida
  update = async (req, res) => {
    res.json(await this.#useCases.finishPartida(req.params.id, req.user));
  };

  // DELETE /partidas/:id — 204: se borró y no hay nada que devolver
  remove = async (req, res) => {
    await this.#useCases.deletePartida(req.params.id);
    res.status(204).send();
  };
}

export default PartidasController;
