/**
 * Controlador del Juego.
 * Recibe los casos de uso por inyección de dependencias; no conoce DAOs ni iNaturalist.
 */
class GameController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // POST /api/inaturalist/juego/iniciar?place_id=&locale=
  start = async (req, res) => {
    res.json(await this.#useCases.startGame(req.query, req.user));
  };

  // GET /api/inaturalist/juego/aves?place_id=&locale=
  questions = async (req, res) => {
    res.json(await this.#useCases.getQuestions(req.query, req.user));
  };

  // POST /api/inaturalist/juego/respuesta
  answer = async (req, res) => {
    res.json(await this.#useCases.answerQuestion(req.body, req.user));
  };

  // GET /api/inaturalist/juego/sesion
  activeSession = async (req, res) => {
    res.json(await this.#useCases.getActiveSession(req.user));
  };

  // GET /api/inaturalist/juego/sesion/estadisticas
  sessionStats = async (req, res) => {
    res.json(await this.#useCases.getSessionStats(req.user));
  };

  // POST /api/inaturalist/juego/terminar
  finish = async (req, res) => {
    res.json(await this.#useCases.finishGame(req.user));
  };

  // GET /api/inaturalist/juego/ranking?limit=
  ranking = async (req, res) => {
    res.json(await this.#useCases.getRanking(req.query));
  };
}

export default GameController;
