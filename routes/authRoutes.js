import express from "express";
import validate from "../middlewares/validate.js";
import { registerSchema, loginSchema, refreshSchema } from "../schemas/authSchema.js";

/**
 * Factory de Router de Autenticación. Todas sus rutas son públicas
 * (son justamente las que te permiten conseguir un token).
 */
function createAuthRouter(controller) {
  const router = express.Router();

  router.post("/register", validate(registerSchema), controller.register);
  router.post("/login", validate(loginSchema), controller.login);
  router.post("/refresh", validate(refreshSchema), controller.refresh);
  router.post("/logout", controller.logout);

  return router;
}

export default createAuthRouter;
