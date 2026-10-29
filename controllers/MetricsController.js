/**
 * Controlador de Métricas.
 * Recibe los casos de uso por inyección de dependencias; no conoce ningún DAO.
 */
class MetricsController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // GET /api/inaturalist/metricas/usuario
  user = async (req, res) => {
    res.json(await this.#useCases.getUserMetrics(req.user));
  };

  // GET /api/inaturalist/metricas/global
  global = async (req, res) => {
    res.json(await this.#useCases.getGlobalMetrics());
  };
}

export default MetricsController;
