/**
 * Controlador de estado: responde si el servidor está vivo (lo usan los monitoreos y el front).
 */
class HealthController {
  #info;

  constructor({ appName, version }) {
    this.#info = { app: appName, version };
  }

  // GET /
  status = (req, res) => {
    res.json({ status: "ok", ...this.#info });
  };
}

export default HealthController;
