import express from "express";
import validate, { validateQuery, validateParams } from "../middlewares/validate.js";
import {
  queryPartidasSchema,
  createPartidaSchema,
  updatePartidaSchema,
  partidaIdParamSchema,
} from "../schemas/partidaSchema.js";

/**
 * Factory de Router de Partidas (se monta en /partidas). CRUD completo de la entidad.
 * Todas necesitan login; borrar es solo para admins. Que un jugador solo vea SUS partidas
 * lo decide el caso de uso (autorización por dueño).
 */
function createPartidasRouter(controller, { authenticate, authorize }) {
  const router = express.Router();

  router.use(authenticate);

  router.get("/", validateQuery(queryPartidasSchema), controller.list);
  router.get("/:id", validateParams(partidaIdParamSchema), controller.get);
  router.post("/", validate(createPartidaSchema), controller.create);
  router.patch("/:id", validateParams(partidaIdParamSchema), validate(updatePartidaSchema), controller.update);
  router.delete("/:id", authorize("admin"), validateParams(partidaIdParamSchema), controller.remove);

  return router;
}

export default createPartidasRouter;
