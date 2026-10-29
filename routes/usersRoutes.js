import express from "express";
import validate, { validateQuery, validateParams } from "../middlewares/validate.js";
import { changePasswordSchema, updateUserSchema, queryUsersSchema, userIdParamSchema } from "../schemas/userSchema.js";

/**
 * Factory de Router de Usuarios.
 * Recibe el controlador ya instanciado y los middlewares de auth.
 * Orden en cada ruta: authenticate → authorize → validación → controller
 * (es más barato rechazar un pedido sin permiso que validar su body).
 */
function createUsersRouter(controller, { authenticate, authorize }) {
  const router = express.Router();

  // Todas las rutas de usuarios necesitan estar logueado
  router.use(authenticate);

  // "/me" va ANTES que "/:id": si no, Express tomaría "me" como si fuera un id
  router.get("/me", controller.me);
  router.patch("/me/password", validate(changePasswordSchema), controller.changeMyPassword);

  router.get("/", authorize("admin", "moderador"), validateQuery(queryUsersSchema), controller.list);
  router.get("/:id", validateParams(userIdParamSchema), controller.get);
  router.patch("/:id", authorize("admin"), validateParams(userIdParamSchema), validate(updateUserSchema), controller.update);
  router.post("/:id/reset-password", authorize("admin"), validateParams(userIdParamSchema), controller.resetPassword);

  return router;
}

export default createUsersRouter;
