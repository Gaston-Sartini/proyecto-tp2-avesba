import express from "express";

/**
 * Factory de Router de estado. Pública: no necesita login.
 */
function createHealthRouter(controller) {
  const router = express.Router();

  router.get("/", controller.status);

  return router;
}

export default createHealthRouter;
