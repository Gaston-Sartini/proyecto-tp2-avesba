import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, registerPlayer } from "../helpers.js";

describe("Aplicación", () => {
  let api;
  before(async () => (api = await startServer()));
  after(() => api.close());

  describe("GET / (estado)", () => {
    it("responde que el servidor está vivo, con nombre y versión", async () => {
      const response = await api.get("/");
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, { status: "ok", app: "AvesBA API", version: "1.0.0" });
    });
  });

  describe("Errores", () => {
    it("una ruta inexistente responde 404 con el formato estándar", async () => {
      const response = await api.get("/no-existe");
      assert.equal(response.status, 404);
      assert.deepEqual(response.body, {
        error: { code: "ROUTE_NOT_FOUND", message: "La ruta GET /no-existe no existe" },
        detail: "La ruta GET /no-existe no existe",
      });
    });

    it("un body que no es JSON válido responde 400 INVALID_JSON (no 500)", async () => {
      const response = await api.request("POST", "/auth/login", {
        body: "{ esto no es json",
        headers: { "Content-Type": "application/json" },
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, "INVALID_JSON");
    });

    it("los errores de validación traen el detalle de cada campo", async () => {
      const response = await api.post("/auth/login", { email: "x" });
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, "VALIDATION_ERROR");
      assert.ok(response.body.error.details.every((d) => d.field && d.message));
      assert.equal(response.body.detail, response.body.error.details[0].message);
    });
  });

  describe("CORS (el front corre en otro origen)", () => {
    it("permite al front de Vite mandar cookies", async () => {
      const response = await api.request("OPTIONS", "/auth/login", {
        headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "POST" },
      });
      assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
      assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    });

    it("no habilita a orígenes desconocidos", async () => {
      const response = await api.get("/", { headers: { Origin: "http://sitio-malo.com" } });
      assert.equal(response.headers.get("access-control-allow-origin"), null);
    });
  });

  describe("Flujos completos", () => {
    it("registro → perfil → refresh → logout", async () => {
      const player = await registerPlayer(api, { nombre: "Full", apellido: "Flow" });
      assert.equal((await api.get("/users/me", { token: player.token })).status, 200);

      const refresh = await api.post("/auth/refresh", { refresh_token: player.refreshToken });
      assert.equal(refresh.status, 200);
      assert.equal((await api.get("/users/me", { token: refresh.body.access_token })).status, 200);

      assert.equal((await api.post("/auth/logout", {})).status, 200);
    });

    it("partida completa como la juega el front (solo con cookies)", async () => {
      const player = await registerPlayer(api, { nombre: "Game", apellido: "Flow" });
      const login = await api.post("/auth/login", { email: player.email, password: player.password });
      const cookie = login.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      const JUEGO = "/api/inaturalist/juego";

      assert.equal((await api.post(`${JUEGO}/iniciar`, undefined, { cookie })).status, 200);
      const preguntas = (await api.get(`${JUEGO}/aves`, { cookie })).body.preguntas;
      assert.equal(preguntas.length, 10);

      let aciertos = 0;
      for (const pregunta of preguntas) {
        const respuesta = await api.post(
          `${JUEGO}/respuesta`,
          { ave_id: pregunta.id, respuesta_usuario: pregunta.nombre },
          { cookie }
        );
        if (respuesta.body.es_correcta) aciertos++;
      }

      const metricas = await api.get("/api/inaturalist/metricas/usuario", { cookie });
      assert.equal(metricas.status, 200);

      const fin = await api.post(`${JUEGO}/terminar`, undefined, { cookie });
      assert.equal(fin.status, 200);
      assert.equal(fin.body.total_aciertos, aciertos);
      assert.equal(fin.body.puntos_totales, 100 + 5 + 15 + 50); // 10 aciertos + bonus de 3, 5 y 10

      const ranking = await api.get(`${JUEGO}/ranking`, { cookie });
      assert.equal(ranking.body.ranking[0].nombre, "Game");
    });
  });
});
