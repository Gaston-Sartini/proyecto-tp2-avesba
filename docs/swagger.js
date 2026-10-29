import { readFileSync } from "node:fs";
import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

// La documentación vive en openapi.yaml (OpenAPI 3): acá solo la leemos y la publicamos
const openapi = YAML.parse(readFileSync(new URL("./openapi.yaml", import.meta.url), "utf8"));

/**
 * Router de la documentación:
 * - /api-docs       → Swagger UI (la página para leer y probar la API con "Try it out")
 * - /api-docs.json  → el mismo documento en JSON (por si otra herramienta lo necesita)
 */
function createDocsRouter() {
  const router = express.Router();

  router.get("/api-docs.json", (req, res) => res.json(openapi));
  router.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: "AvesBA API — Documentación",
      swaggerOptions: { persistAuthorization: true }, // no perder el token al recargar la página
    })
  );

  return router;
}

export { openapi };
export default createDocsRouter;
