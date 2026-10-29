import express from "express";
import validate from "../middlewares/validate.js";
import parseTextJson from "../middlewares/parseTextJson.js";
import { connectionLogSchema } from "../schemas/activitySchema.js";

/**
 * Factory de Router de Actividad (se monta en /api).
 * Pública: el navegador manda el aviso al cerrar la pestaña, incluso si la sesión ya venció.
 */
function createActivityRouter(controller) {
  const router = express.Router();

  // express.text() + parseTextJson: sendBeacon manda el JSON como texto plano
  router.post("/user-connection-log", express.text(), parseTextJson, validate(connectionLogSchema), controller.connectionLog);

  return router;
}

export default createActivityRouter;
