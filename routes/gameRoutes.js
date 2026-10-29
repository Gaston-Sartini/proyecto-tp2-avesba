import express from "express";
import validate, { validateQuery } from "../middlewares/validate.js";
import { birdsQuerySchema, answerSchema, rankingQuerySchema } from "../schemas/gameSchema.js";

/**
 * Factory de Router del Juego (se monta en /api/inaturalist/juego).
 * Todas las rutas necesitan estar logueado: la partida es de cada jugador.
 */
function createGameRouter(controller, { authenticate }) {
  const router = express.Router();

  router.use(authenticate);

  router.post("/iniciar", validateQuery(birdsQuerySchema), controller.start);
  router.get("/aves", validateQuery(birdsQuerySchema), controller.questions);
  router.post("/respuesta", validate(answerSchema), controller.answer);
  // "/sesion/estadisticas" y "/sesion" son rutas distintas: Express compara la ruta completa
  router.get("/sesion/estadisticas", controller.sessionStats);
  router.get("/sesion", controller.activeSession);
  router.post("/terminar", controller.finish);
  router.get("/ranking", validateQuery(rankingQuerySchema), controller.ranking);

  return router;
}

export default createGameRouter;
