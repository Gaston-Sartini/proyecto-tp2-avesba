import express from "express";

/**
 * Factory de Router de Métricas (se monta en /api/inaturalist/metricas).
 */
function createMetricsRouter(controller, { authenticate, authorize }) {
  const router = express.Router();

  router.use(authenticate);

  router.get("/usuario", controller.user);
  router.get("/global", authorize("admin", "moderador"), controller.global);

  return router;
}

export default createMetricsRouter;
