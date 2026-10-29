import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PERSISTENCES, startServer, loginAdmin, playerWithRole } from "../helpers.js";

for (const persistence of PERSISTENCES) {
  describe(`Partidas: CRUD (${persistence})`, () => {
    let api, adminToken;
    before(async () => {
      api = await startServer({ persistence });
      adminToken = await loginAdmin(api);
    });
    after(() => api.close());

    // Crea una partida y responde bien las primeras `aciertos` preguntas
    async function partidaJugada(token, aciertos = 2) {
      const partida = (await api.post("/partidas", {}, { token })).body;
      for (const pregunta of partida.preguntas.slice(0, aciertos)) {
        await api.post("/api/inaturalist/juego/respuesta", { ave_id: pregunta.id, respuesta_usuario: pregunta.nombre }, { token });
      }
      return partida;
    }

    describe("POST /partidas", () => {
      it("crea una partida activa con 10 preguntas: 201", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const response = await api.post("/partidas", { place_id: 7190, locale: "es-AR" }, { token: jugador.token });
        assert.equal(response.status, 201);
        assert.equal(response.body.user_id, jugador.id);
        assert.equal(response.body.estado, "activa");
        assert.equal(response.body.place_id, 7190);
        assert.equal(response.body.preguntas.length, 10);
        assert.equal(response.body.terminadaAt, null);
      });

      it("sin body usa Buenos Aires y es-AR", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const response = await api.request("POST", "/partidas", { token: jugador.token });
        assert.equal(response.status, 201);
        assert.equal(response.body.place_id, 10434);
        assert.equal(response.body.locale, "es-AR");
      });

      it("con datos inválidos responde 400 y sin token 401", async () => {
        const jugador = await playerWithRole(api, "jugador");
        assert.equal((await api.post("/partidas", { place_id: "BA" }, { token: jugador.token })).status, 400);
        assert.equal((await api.post("/partidas", {})).status, 401);
      });
    });

    describe("GET /partidas/:id", () => {
      it("devuelve la partida con sus respuestas (relación partida → respuestas)", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const partida = await partidaJugada(jugador.token, 2);
        const response = await api.get(`/partidas/${partida.id}`, { token: jugador.token });
        assert.equal(response.status, 200);
        assert.equal(response.body.id, partida.id);
        assert.equal(response.body.respuestas.length, 2);
        assert.ok(response.body.respuestas.every((r) => r.session_id === partida.id && r.es_correcta));
      });

      it("un jugador no puede ver la partida de otro (403), un moderador sí", async () => {
        const duenio = await playerWithRole(api, "jugador");
        const otro = await playerWithRole(api, "jugador");
        const moderador = await playerWithRole(api, "moderador");
        const partida = await partidaJugada(duenio.token, 1);
        assert.equal((await api.get(`/partidas/${partida.id}`, { token: otro.token })).status, 403);
        assert.equal((await api.get(`/partidas/${partida.id}`, { token: moderador.token })).status, 200);
      });

      it("si no existe responde 404 PARTIDA_NOT_FOUND, y con un id inválido 400", async () => {
        const response = await api.get("/partidas/999999", { token: adminToken });
        assert.equal(response.status, 404);
        assert.equal(response.body.error.code, "PARTIDA_NOT_FOUND");
        assert.equal((await api.get("/partidas/abc", { token: adminToken })).status, 400);
      });
    });

    describe("GET /partidas (listado)", () => {
      it("un jugador ve solo sus partidas, sin el lote de preguntas", async () => {
        const jugador = await playerWithRole(api, "jugador");
        await partidaJugada(jugador.token);
        await partidaJugada(jugador.token); // cierra la anterior y crea otra
        const response = await api.get("/partidas", { token: jugador.token });
        assert.equal(response.status, 200);
        assert.equal(response.body.total, 2);
        assert.ok(response.body.items.every((p) => p.user_id === jugador.id && p.preguntas === undefined));
      });

      it("un jugador que pide las partidas de otro recibe 403", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const otro = await playerWithRole(api, "jugador");
        assert.equal((await api.get(`/partidas?user_id=${otro.id}`, { token: jugador.token })).status, 403);
      });

      it("un admin filtra por usuario y estado", async () => {
        const jugador = await playerWithRole(api, "jugador");
        await partidaJugada(jugador.token);
        await partidaJugada(jugador.token);
        const terminadas = await api.get(`/partidas?user_id=${jugador.id}&estado=terminada`, { token: adminToken });
        const activas = await api.get(`/partidas?user_id=${jugador.id}&estado=activa`, { token: adminToken });
        assert.equal(terminadas.body.total, 1);
        assert.equal(activas.body.total, 1);
        assert.equal(activas.body.items[0].estado, "activa");
      });

      it("ordena por puntos y pagina", async () => {
        const jugador = await playerWithRole(api, "jugador");
        for (const aciertos of [1, 3, 2]) {
          await partidaJugada(jugador.token, aciertos);
        }
        await api.post("/api/inaturalist/juego/terminar", undefined, { token: jugador.token });

        const ordenadas = await api.get(`/partidas?user_id=${jugador.id}&sort=-puntos_totales`, { token: adminToken });
        const puntos = ordenadas.body.items.map((p) => p.puntos_totales);
        assert.deepEqual(puntos, [35, 20, 10]);

        const pagina = await api.get(`/partidas?user_id=${jugador.id}&sort=puntos_totales&per_page=2&page=2`, { token: adminToken });
        assert.equal(pagina.body.items.length, 1);
        assert.equal(pagina.body.items[0].puntos_totales, 35);
        assert.equal(pagina.body.pages, 2);
      });

      it("con parámetros inválidos responde 400", async () => {
        assert.equal((await api.get("/partidas?estado=pausada", { token: adminToken })).status, 400);
        assert.equal((await api.get("/partidas?sort=nombre", { token: adminToken })).status, 400);
      });
    });

    describe("PATCH /partidas/:id (terminar)", () => {
      it("termina la partida y guarda el puntaje", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const partida = await partidaJugada(jugador.token, 3);
        const response = await api.patch(`/partidas/${partida.id}`, { estado: "terminada" }, { token: jugador.token });
        assert.equal(response.status, 200);
        assert.equal(response.body.estado, "terminada");
        assert.equal(response.body.puntos_totales, 35);
        assert.equal(response.body.total_aciertos, 3);
        assert.equal(typeof response.body.terminadaAt, "number");
      });

      it("terminar una partida ya terminada responde 409", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const partida = await partidaJugada(jugador.token);
        await api.patch(`/partidas/${partida.id}`, { estado: "terminada" }, { token: jugador.token });
        const response = await api.patch(`/partidas/${partida.id}`, { estado: "terminada" }, { token: jugador.token });
        assert.equal(response.status, 409);
        assert.equal(response.body.error.code, "PARTIDA_ALREADY_FINISHED");
      });

      it("solo se puede cambiar el estado a 'terminada' (400) y no la partida de otro (403)", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const otro = await playerWithRole(api, "jugador");
        const partida = await partidaJugada(jugador.token);
        assert.equal((await api.patch(`/partidas/${partida.id}`, { estado: "activa" }, { token: jugador.token })).status, 400);
        assert.equal((await api.patch(`/partidas/${partida.id}`, { estado: "terminada" }, { token: otro.token })).status, 403);
      });
    });

    describe("DELETE /partidas/:id (solo admins)", () => {
      it("borra la partida y sus respuestas: 204, y deja de contar en el ranking", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const partida = await partidaJugada(jugador.token, 3);
        await api.post("/api/inaturalist/juego/terminar", undefined, { token: jugador.token });

        const response = await api.request("DELETE", `/partidas/${partida.id}`, { token: adminToken });
        assert.equal(response.status, 204);
        assert.equal((await api.get(`/partidas/${partida.id}`, { token: adminToken })).status, 404);
        assert.deepEqual(await api.daos.gameResultsDao.getBySession(partida.id), []);

        const metricas = await api.get("/api/inaturalist/metricas/usuario", { token: jugador.token });
        assert.equal(metricas.body.puntuacion_total, 0);
      });

      it("un jugador no puede borrar partidas, ni siquiera las suyas (403)", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const partida = await partidaJugada(jugador.token);
        assert.equal((await api.request("DELETE", `/partidas/${partida.id}`, { token: jugador.token })).status, 403);
      });

      it("si no existe responde 404", async () => {
        assert.equal((await api.request("DELETE", "/partidas/999999", { token: adminToken })).status, 404);
      });
    });
  });
}
