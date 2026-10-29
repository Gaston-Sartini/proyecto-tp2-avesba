import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, registerPlayer } from "../helpers.js";

const JUEGO = "/api/inaturalist/juego";

// Notificador espía: mismo contrato notify({ subject, body }), pero guarda los avisos para revisarlos
function crearNotificadorEspia() {
  const avisos = [];
  return { avisos, async notify(aviso) { avisos.push(aviso); } };
}

// Los listeners son asíncronos: esperamos un "tick" para que terminen
const esperar = () => new Promise((resolve) => setImmediate(resolve));

describe("Eventos y notificaciones", () => {
  let api;
  const espia = crearNotificadorEspia();
  before(async () => (api = await startServer({ notifier: espia })));
  after(() => api.close());

  it("al registrarse un jugador se manda la bienvenida", async () => {
    const player = await registerPlayer(api, { nombre: "Eva", apellido: "Luna" });
    await esperar();
    assert.ok(espia.avisos.some((a) => a.subject === "Bienvenida" && a.body.includes(player.email)));
  });

  it("al lograr una racha de 3 y al terminar la partida se avisa", async () => {
    const { token } = await registerPlayer(api);
    await api.post(`${JUEGO}/iniciar`, undefined, { token });
    const { preguntas } = (await api.get(`${JUEGO}/sesion`, { token })).body;
    for (const pregunta of preguntas.slice(0, 3)) {
      await api.post(`${JUEGO}/respuesta`, { ave_id: pregunta.id, respuesta_usuario: pregunta.nombre }, { token });
    }
    await api.post(`${JUEGO}/terminar`, undefined, { token });
    await esperar();

    assert.ok(espia.avisos.some((a) => a.subject === "Racha" && a.body.includes("3 aciertos seguidos")));
    assert.ok(espia.avisos.some((a) => a.subject === "Partida terminada" && a.body.includes("35 puntos")));
  });

  describe("POST /api/user-connection-log (aviso del front al cerrar la pestaña)", () => {
    it("acepta el JSON como texto plano (así lo manda sendBeacon) y responde 204", async () => {
      const response = await api.request("POST", "/api/user-connection-log", {
        body: JSON.stringify({ userId: 7, tiempoConectado: 125000 }),
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
      });
      assert.equal(response.status, 204);
      await esperar();
      assert.ok(espia.avisos.some((a) => a.subject === "Desconexión" && a.body === "El usuario 7 estuvo conectado 125 segundos"));
    });

    it("también acepta un visitante sin usuario (userId null)", async () => {
      const response = await api.post("/api/user-connection-log", { userId: null, tiempoConectado: 0 });
      assert.equal(response.status, 204);
    });

    it("con datos inválidos responde 400", async () => {
      const response = await api.request("POST", "/api/user-connection-log", {
        body: "esto no es json",
        headers: { "Content-Type": "text/plain" },
      });
      assert.equal(response.status, 400);
      const negativo = await api.post("/api/user-connection-log", { userId: 1, tiempoConectado: -5 });
      assert.equal(negativo.status, 400);
    });
  });
});

describe("Si el notificador falla", () => {
  let api;
  const notificadorRoto = {
    async notify() {
      throw new Error("se cayó el servidor de mails");
    },
  };
  before(async () => (api = await startServer({ notifier: notificadorRoto })));
  after(() => api.close());

  it("el registro igual funciona (la notificación no afecta al caso de uso)", async () => {
    const response = await api.post("/auth/register", {
      nombre: "Ana",
      apellido: "Paz",
      email: `roto.${Date.now()}@test.com`,
      password: "SecurePassword123!",
    });
    assert.equal(response.status, 201);
  });
});
