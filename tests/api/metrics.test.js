import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PERSISTENCES, startServer, registerPlayer, loginAdmin, playerWithRole } from "../helpers.js";

const METRICAS = "/api/inaturalist/metricas";
const JUEGO = "/api/inaturalist/juego";

for (const persistence of PERSISTENCES) {
  describe(`Métricas (${persistence})`, () => {
    let api;
    before(async () => (api = await startServer({ persistence })));
    after(() => api.close());

    // Juega una partida: acierta las primeras `aciertos` preguntas y erra las siguientes `errores`
    async function jugar(token, aciertos, errores) {
      await api.post(`${JUEGO}/iniciar`, undefined, { token });
      const { preguntas } = (await api.get(`${JUEGO}/sesion`, { token })).body;
      for (const [i, pregunta] of preguntas.slice(0, aciertos + errores).entries()) {
        const respuesta = i < aciertos ? pregunta.nombre : "Otra cosa";
        await api.post(`${JUEGO}/respuesta`, { ave_id: pregunta.id, respuesta_usuario: respuesta }, { token });
      }
      await api.post(`${JUEGO}/terminar`, undefined, { token });
    }

    describe("GET /metricas/usuario", () => {
      it("sin token responde 401", async () => {
        assert.equal((await api.get(`${METRICAS}/usuario`)).status, 401);
      });

      it("un jugador que no jugó tiene todo en 0", async () => {
        const { token } = await registerPlayer(api);
        const response = await api.get(`${METRICAS}/usuario`, { token });
        assert.equal(response.status, 200);
        assert.equal(response.body.total_intentos, 0);
        assert.equal(response.body.total_aciertos, 0);
        assert.equal(response.body.porcentaje_acierto, 0);
        assert.equal(response.body.puntuacion_total, 0);
        assert.ok(response.body.posicion_ranking >= 1);
      });

      it("suma todas sus partidas y calcula su posición en el ranking", async () => {
        const player = await registerPlayer(api, { nombre: "Metrics", apellido: "Player" });
        await jugar(player.token, 3, 1); // 35 puntos
        await jugar(player.token, 1, 1); // 10 puntos

        const response = await api.get(`${METRICAS}/usuario`, { token: player.token });
        assert.equal(response.body.nombre, "Metrics");
        assert.equal(response.body.apellido, "Player");
        assert.equal(response.body.total_intentos, 6);
        assert.equal(response.body.total_aciertos, 4);
        assert.equal(response.body.porcentaje_acierto, 66.67);
        assert.equal(response.body.puntuacion_total, 45);

        const ranking = (await api.get(`${JUEGO}/ranking?limit=100`, { token: player.token })).body.ranking;
        const posicionEsperada = ranking.findIndex((j) => j.user_id === response.body.user_id) + 1;
        assert.equal(response.body.posicion_ranking, posicionEsperada);
      });
    });

    describe("GET /metricas/global", () => {
      it("sin token responde 401", async () => {
        assert.equal((await api.get(`${METRICAS}/global`)).status, 401);
      });

      it("un jugador común recibe 403 'Acceso denegado'", async () => {
        const { token } = await registerPlayer(api);
        const response = await api.get(`${METRICAS}/global`, { token });
        assert.equal(response.status, 403);
        assert.match(response.body.detail, /Acceso denegado/);
      });

      it("un admin ve las métricas de todo el sistema", async () => {
        const player = await registerPlayer(api);
        await jugar(player.token, 2, 1);

        const response = await api.get(`${METRICAS}/global`, { token: await loginAdmin(api) });
        assert.equal(response.status, 200);
        assert.ok(response.body.total_jugadores_activos >= 1);
        assert.ok(response.body.total_intentos_sistema >= 3);
        assert.ok(response.body.porcentaje_acierto_global > 0);
        for (const ave of [response.body.ave_mas_acertada, response.body.ave_menos_acertada]) {
          assert.deepEqual(Object.keys(ave).sort(), ["id", "nombre", "porcentaje_acierto", "total_aciertos", "total_intentos"]);
        }
        assert.ok(response.body.ave_mas_acertada.porcentaje_acierto >= response.body.ave_menos_acertada.porcentaje_acierto);
      });

      it("un moderador también puede verlas", async () => {
        const moderador = await playerWithRole(api, "moderador");
        assert.equal((await api.get(`${METRICAS}/global`, { token: moderador.token })).status, 200);
      });
    });
  });
}

describe("Métricas globales sin partidas jugadas", () => {
  let api;
  before(async () => (api = await startServer()));
  after(() => api.close());

  it("devuelve 0 y las aves más/menos acertadas en null (sin romperse)", async () => {
    const response = await api.get(`${METRICAS}/global`, { token: await loginAdmin(api) });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      total_jugadores_activos: 0,
      total_intentos_sistema: 0,
      porcentaje_acierto_global: 0,
      ave_mas_acertada: null,
      ave_menos_acertada: null,
    });
  });
});
