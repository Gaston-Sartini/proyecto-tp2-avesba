import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { startServer } from "../helpers.js";

const RAIZ = new URL("../../", import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, RAIZ), "utf8");
const METODOS = ["get", "post", "put", "patch", "delete"];

/**
 * Arma la lista de endpoints REALES leyendo el código:
 * - container.js dice en qué prefijo se monta cada router: router.use("/users", createUsersRouter(...))
 * - cada archivo de routes/ dice sus rutas: router.get("/:id", ...)
 * Devuelve strings como "GET /users/{id}" (con el formato de OpenAPI).
 */
function endpointsDelCodigo() {
  const prefijos = {};
  for (const [, prefijo, factory] of leer("container/container.js").matchAll(/router\.use\("([^"]*)",\s*(create\w+Router)\(/g)) {
    prefijos[factory] = prefijo;
  }

  const endpoints = [];
  for (const archivo of readdirSync(new URL("routes/", RAIZ))) {
    const codigo = leer(`routes/${archivo}`);
    const factory = codigo.match(/function (create\w+Router)/)[1];
    const prefijo = prefijos[factory] === "/" ? "" : prefijos[factory];
    for (const [, metodo, ruta] of codigo.matchAll(/router\.(get|post|put|patch|delete)\("([^"]*)"/g)) {
      const completa = (prefijo + (ruta === "/" ? "" : ruta) || "/").replace(/:(\w+)/g, "{$1}");
      endpoints.push(`${metodo.toUpperCase()} ${completa}`);
    }
  }
  return endpoints.sort();
}

describe("Documentación Swagger (/api-docs)", () => {
  let api, spec;
  before(async () => {
    api = await startServer();
    spec = (await api.get("/api-docs.json")).body;
  });
  after(() => api.close());

  const operaciones = () =>
    Object.entries(spec.paths).flatMap(([ruta, item]) =>
      METODOS.filter((m) => item[m]).map((m) => ({ endpoint: `${m.toUpperCase()} ${ruta}`, ruta, metodo: m, op: item[m] }))
    );

  it("Swagger UI se publica en /api-docs", async () => {
    const response = await api.get("/api-docs/");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(response.body, /swagger-ui/);
  });

  it("es un documento OpenAPI 3", () => {
    assert.match(spec.openapi, /^3\./);
    assert.ok(spec.info.title);
  });

  it("documenta TODOS los endpoints del código, y solo esos", () => {
    const documentados = operaciones()
      .map((o) => o.endpoint)
      .sort();
    assert.deepEqual(documentados, endpointsDelCodigo());
  });

  it("cada endpoint documentado existe de verdad en el servidor (no da ROUTE_NOT_FOUND)", async () => {
    for (const { ruta, metodo } of operaciones()) {
      const url = ruta.replace(/\{\w+\}/g, "1");
      const response = await api.request(metodo.toUpperCase(), url);
      assert.notEqual(response.body?.error?.code, "ROUTE_NOT_FOUND", `${metodo} ${ruta}`);
    }
  });

  it("cada endpoint tiene descripción, una respuesta de éxito y errores con el formato común", () => {
    for (const { endpoint, op } of operaciones()) {
      assert.ok(op.summary, `${endpoint} sin summary`);
      const codigos = Object.keys(op.responses);
      assert.ok(codigos.some((c) => c.startsWith("2")), `${endpoint} sin respuesta 2xx`);
      for (const codigo of codigos.filter((c) => !c.startsWith("2"))) {
        assert.match(op.responses[codigo].$ref ?? "", /^#\/components\/responses\//, `${endpoint} ${codigo}`);
      }
    }
  });

  it("los bodies tienen ejemplo y los schemas se reutilizan con $ref", () => {
    for (const { endpoint, op } of operaciones()) {
      if (!op.requestBody) continue;
      const json = op.requestBody.content["application/json"];
      assert.ok(json.example || json.examples, `${endpoint} sin ejemplo`);
      assert.match(json.schema.$ref, /^#\/components\/schemas\//, `${endpoint} sin $ref`);
    }
  });

  it("todos los $ref apuntan a algo que existe", () => {
    const refs = new Set();
    const recorrer = (nodo) => {
      if (Array.isArray(nodo)) return nodo.forEach(recorrer);
      if (nodo && typeof nodo === "object") {
        if (typeof nodo.$ref === "string") refs.add(nodo.$ref);
        Object.values(nodo).forEach(recorrer);
      }
    };
    recorrer(spec);
    assert.ok(refs.size > 20);
    for (const ref of refs) {
      const destino = ref
        .slice(2)
        .split("/")
        .reduce((nodo, parte) => nodo?.[parte], spec);
      assert.ok(destino, `$ref roto: ${ref}`);
    }
  });

  it("el formato de error está definido en components/schemas", () => {
    assert.deepEqual(spec.components.schemas.Error.required, ["error", "detail"]);
  });
});
