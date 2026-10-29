/**
 * Controlador de Actividad.
 * Recibe los casos de uso por inyección de dependencias.
 */
class ActivityController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // POST /api/user-connection-log — 204: recibido, sin nada que devolver (sendBeacon no lee la respuesta)
  connectionLog = async (req, res) => {
    await this.#useCases.logConnection(req.body);
    res.status(204).send();
  };
}

export default ActivityController;
