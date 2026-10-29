import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PERSISTENCES, startServer, registerPlayer } from "../helpers.js";

const JUEGO = "/api/inaturalist/juego";

for (const persistence of PERSISTENCES) {
  describe(`Juego (${persistence})`, () => {
    let api;
    before(async () => (api = await startServer({ persistence })));
    after(() => api.close());

    // Ayudas: cada test usa su propio jugador
    const nuevoJugador = () => registerPlayer(api);
    const iniciar = async (token) => {
      const response = await api.post(`${JUEGO}/iniciar`, undefined, { token });
      assert.equal(response.status, 200);
      return response.body.session_id;
    };
    const lote = async (token) => (await api.get(`${JUEGO}/sesion`, { token })).body.preguntas;
    const responder = (token, pregunta, respuesta, extra = {}) =>
      api.post(`${JUEGO}/respuesta`, { ave_id: pregunta.id, respuesta_usuario: respuesta, ...extra }, { token });
    const nombreIncorrecto = (pregunta) => pregunta.opciones.find((o) => o.id !== pregunta.id).nombre;

    describe("Protección", () => {
      it("todas las rutas del juego piden estar logueado (401)", async () => {
        for (const [method, path] of [
          ["POST", "/iniciar"],
          ["POST", "/terminar"],
          ["GET", "/aves"],
          ["GET", "/sesion"],
          ["GET", "/sesion/estadisticas"],
          ["POST", "/respuesta"],
          ["GET", "/ranking"],
        ]) {
          const response = await api.request(method, JUEGO + path);
          assert.equal(response.status, 401, `${method} ${path}`);
        }
      });
    });

    describe("POST /juego/iniciar", () => {
      it("inicia una partida y guarda un lote de 10 preguntas", async () => {
        const { token } = await nuevoJugador();
        const response = await api.post(`${JUEGO}/iniciar`, undefined, { token });
        assert.equal(response.status, 200);
        assert.ok(response.body.session_id);
        assert.equal(response.body.mensaje, "Sesión iniciada. Comienza a jugar.");

        const session = await api.daos.gameSessionsDao.getById(response.body.session_id);
        assert.equal(session.preguntas.length, 10);
        assert.equal(session.place_id, 10434);
        assert.equal(session.locale, "es-AR");
      });

      it("cada pregunta tiene foto y 4 opciones, una de ellas la correcta", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        for (const pregunta of await lote(token)) {
          assert.ok(pregunta.foto);
          assert.equal(pregunta.opciones.length, 4);
          assert.ok(pregunta.opciones.some((o) => o.id === pregunta.id));
        }
      });

      it("respeta place_id y locale de la query", async () => {
        const { token } = await nuevoJugador();
        const response = await api.post(`${JUEGO}/iniciar?place_id=7190&locale=en-US`, undefined, { token });
        const session = await api.daos.gameSessionsDao.getById(response.body.session_id);
        assert.equal(session.place_id, 7190);
        assert.equal(session.locale, "en-US");
      });

      it("cierra la partida anterior y deja una sola activa", async () => {
        const { token } = await nuevoJugador();
        const primera = await iniciar(token);
        const segunda = await iniciar(token);
        assert.notEqual(primera, segunda);

        assert.equal((await api.daos.gameSessionsDao.getById(primera)).estado, "terminada");
        const activa = await api.daos.gameSessionsDao.getById(segunda);
        assert.equal(activa.estado, "activa");
        assert.equal((await api.daos.gameSessionsDao.getAllActiveByUser(activa.user_id)).length, 1);
      });
    });

    describe("GET /juego/aves", () => {
      it("mientras la partida está activa devuelve siempre el mismo lote", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const primero = await api.get(`${JUEGO}/aves`, { token });
        const segundo = await api.get(`${JUEGO}/aves`, { token });
        assert.equal(primero.body.total, 10);
        assert.deepEqual(primero.body, segundo.body);
      });

      it("sin partida activa arma un lote nuevo de 10", async () => {
        const { token } = await nuevoJugador();
        const response = await api.get(`${JUEGO}/aves?place_id=10434&locale=es-AR`, { token });
        assert.equal(response.status, 200);
        assert.equal(response.body.total, 10);
        assert.equal(response.body.preguntas.length, 10);
      });
    });

    describe("POST /juego/respuesta", () => {
      it("sin partida activa responde 404", async () => {
        const { token } = await nuevoJugador();
        const response = await api.post(`${JUEGO}/respuesta`, { ave_id: 1000, respuesta_usuario: "Ave 0" }, { token });
        assert.equal(response.status, 404);
        assert.equal(response.body.error.code, "NO_ACTIVE_SESSION");
      });

      it("una respuesta correcta suma 10 puntos", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const [pregunta] = await lote(token);
        const response = await responder(token, pregunta, pregunta.nombre);
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { es_correcta: true, puntos_obtenidos: 10, mensaje: "¡Correcto! ✓" });
      });

      it("una respuesta incorrecta suma 0 puntos", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const [pregunta] = await lote(token);
        const response = await responder(token, pregunta, nombreIncorrecto(pregunta));
        assert.deepEqual(response.body, { es_correcta: false, puntos_obtenidos: 0, mensaje: "Incorrecto. ✗" });
      });

      it("usa el nombre del LOTE, no el ave_nombre que manda el cliente (anti-trampa)", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const [primera, segunda] = await lote(token);

        const trucada = await responder(token, primera, primera.nombre, { ave_nombre: "Cualquiera" });
        assert.equal(trucada.body.es_correcta, true);

        const incorrecta = await responder(token, segunda, "Otra cosa", { ave_nombre: "Otra cosa" });
        assert.equal(incorrecta.body.es_correcta, false);
      });

      it("no deja responder dos veces la misma ave (400)", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const [pregunta] = await lote(token);
        await responder(token, pregunta, pregunta.nombre);
        const repetida = await responder(token, pregunta, pregunta.nombre);
        assert.equal(repetida.status, 400);
        assert.equal(repetida.body.error.code, "ALREADY_ANSWERED");
      });

      it("rechaza un ave que no está en el lote (400)", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const response = await api.post(`${JUEGO}/respuesta`, { ave_id: 999999, respuesta_usuario: "Cualquiera" }, { token });
        assert.equal(response.status, 400);
        assert.match(response.body.detail, /lote/);
      });

      it("una partida sin lote (vieja) responde 409", async () => {
        const { token } = await nuevoJugador();
        const sessionId = await iniciar(token);
        await api.daos.gameSessionsDao.update(sessionId, { preguntas: null });
        const response = await api.post(`${JUEGO}/respuesta`, { ave_id: 1000, respuesta_usuario: "Ave 0" }, { token });
        assert.equal(response.status, 409);
        assert.equal(response.body.error.code, "SESSION_WITHOUT_BATCH");
      });

      it("con un body inválido responde 400", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const response = await api.post(`${JUEGO}/respuesta`, { ave_id: "uno" }, { token });
        assert.equal(response.status, 400);
        assert.equal(response.body.error.code, "VALIDATION_ERROR");
      });

      it("da bonus de racha a los 3 y 5 aciertos seguidos, y la racha se corta con un error", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const preguntas = await lote(token);

        const puntos = [];
        for (const pregunta of preguntas.slice(0, 5)) {
          puntos.push((await responder(token, pregunta, pregunta.nombre)).body.puntos_obtenidos);
        }
        assert.deepEqual(puntos, [10, 10, 15, 10, 25]); // 3ra: 10+5, 5ta: 10+15

        const error = await responder(token, preguntas[5], nombreIncorrecto(preguntas[5]));
        assert.equal(error.body.puntos_obtenidos, 0);
        const sesion = await api.get(`${JUEGO}/sesion`, { token });
        assert.equal(sesion.body.streak_actual, 0);
      });

      it("10 aciertos seguidos dan el bonus épico de 50", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        let ultima;
        for (const pregunta of await lote(token)) ultima = await responder(token, pregunta, pregunta.nombre);
        assert.equal(ultima.body.puntos_obtenidos, 60);
        assert.match(ultima.body.mensaje, /RACHA ÉPICA/);
      });
    });

    describe("GET /juego/sesion (retomar la partida)", () => {
      it("sin partida activa responde 404", async () => {
        const { token } = await nuevoJugador();
        const response = await api.get(`${JUEGO}/sesion`, { token });
        assert.equal(response.status, 404);
        assert.match(response.body.detail, /No hay una sesión activa/);
      });

      it("muestra el lote, las respuestas en orden y los puntos", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const preguntas = await lote(token);
        await responder(token, preguntas[0], preguntas[0].nombre);
        await responder(token, preguntas[1], "Otra cosa");

        const { status, body } = await api.get(`${JUEGO}/sesion`, { token });
        assert.equal(status, 200);
        assert.equal(body.preguntas.length, 10);
        assert.deepEqual(
          body.respuestas.map((r) => r.ave_id),
          [preguntas[0].id, preguntas[1].id]
        );
        assert.deepEqual(
          body.respuestas.map((r) => r.es_correcta),
          [true, false]
        );
        assert.equal(body.puntos_totales, body.respuestas.reduce((s, r) => s + r.puntos_obtenidos + r.bonus_racha, 0));
        assert.equal(body.streak_actual, 0);
      });

      it("recargar no cambia el lote", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        assert.deepEqual(await lote(token), await lote(token));
      });
    });

    describe("GET /juego/sesion/estadisticas", () => {
      it("sin partida activa responde 404 'No hay una sesión activa'", async () => {
        const { token } = await nuevoJugador();
        const response = await api.get(`${JUEGO}/sesion/estadisticas`, { token });
        assert.equal(response.status, 404);
        assert.match(response.body.detail, /No hay una sesión activa/);
      });

      it("muestra las estadísticas de la partida en curso", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const [p1, p2] = await lote(token);
        await responder(token, p1, p1.nombre);
        await responder(token, p2, "Otra cosa");

        const response = await api.get(`${JUEGO}/sesion/estadisticas`, { token });
        assert.equal(response.status, 200);
        assert.equal(response.body.puntos_totales, 10);
        assert.equal(response.body.total_intentos, 2);
        assert.equal(response.body.total_aciertos, 1);
        assert.equal(response.body.porcentaje_acierto, 50);
        assert.equal(response.body.estado, "activa");
      });
    });

    describe("POST /juego/terminar", () => {
      it("sin partida activa responde 404", async () => {
        const { token } = await nuevoJugador();
        assert.equal((await api.post(`${JUEGO}/terminar`, undefined, { token })).status, 404);
      });

      it("termina la partida y guarda el puntaje", async () => {
        const { token } = await nuevoJugador();
        const sessionId = await iniciar(token);
        const preguntas = await lote(token);
        for (const pregunta of preguntas.slice(0, 3)) await responder(token, pregunta, pregunta.nombre);
        await responder(token, preguntas[3], "Otra cosa");

        const response = await api.post(`${JUEGO}/terminar`, undefined, { token });
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
          session_id: sessionId,
          puntos_totales: 35, // 10 + 10 + (10 + 5 de racha)
          total_intentos: 4,
          total_aciertos: 3,
          porcentaje_acierto: 75,
          mensaje: "Sesión finalizada. Puntuación guardada.",
        });

        const session = await api.daos.gameSessionsDao.getById(sessionId);
        assert.equal(session.estado, "terminada");
        assert.equal(session.puntos_totales, 35);
        assert.equal(typeof session.terminadaAt, "number");
        assert.equal((await api.get(`${JUEGO}/sesion`, { token })).status, 404);
      });
    });

    describe("GET /juego/ranking", () => {
      it("devuelve el ranking ordenado por puntos", async () => {
        const { token } = await nuevoJugador();
        await iniciar(token);
        const [pregunta] = await lote(token);
        await responder(token, pregunta, pregunta.nombre);

        const response = await api.get(`${JUEGO}/ranking?limit=10`, { token });
        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.body.ranking));
        assert.equal(response.body.total_jugadores, response.body.ranking.length);
        const puntos = response.body.ranking.map((j) => j.puntos_totales);
        assert.deepEqual(puntos, [...puntos].sort((a, b) => b - a));
        for (const jugador of response.body.ranking) {
          assert.deepEqual(Object.keys(jugador).sort(), ["aciertos", "apellido", "fallos", "nombre", "puntos_totales", "user_id"]);
        }
      });

      it("respeta el límite y valida que esté entre 1 y 100", async () => {
        const { token } = await nuevoJugador();
        await nuevoJugador();
        assert.equal((await api.get(`${JUEGO}/ranking?limit=1`, { token })).body.ranking.length, 1);
        assert.equal((await api.get(`${JUEGO}/ranking?limit=0`, { token })).status, 400);
        assert.equal((await api.get(`${JUEGO}/ranking?limit=101`, { token })).status, 400);
      });
    });
  });
}

describe("Juego cuando iNaturalist no responde", () => {
  let api;
  const proveedorCaido = {
    async getBirds() {
      throw new Error("sin red");
    },
  };
  before(async () => (api = await startServer({ birdsProvider: proveedorCaido })));
  after(() => api.close());

  it("iniciar responde 503 y NO crea la partida", async () => {
    const { token } = await registerPlayer(api);
    const response = await api.post(`${JUEGO}/iniciar`, undefined, { token });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, "BIRDS_UNAVAILABLE");
    assert.equal((await api.get(`${JUEGO}/sesion`, { token })).status, 404);
  });

  it("pedir aves sin partida activa responde 503", async () => {
    const { token } = await registerPlayer(api);
    assert.equal((await api.get(`${JUEGO}/aves`, { token })).status, 503);
  });
});

describe("Juego cuando iNaturalist devuelve muy pocas aves", () => {
  let api;
  const pocasAves = {
    async getBirds() {
      return [{ id: 1, nombre: "Tero", nombreCientifico: "Vanellus chilensis", foto: "x", atribucion: null }];
    },
  };
  before(async () => (api = await startServer({ birdsProvider: pocasAves })));
  after(() => api.close());

  it("iniciar responde 503 (no alcanzan para 10 preguntas)", async () => {
    const { token } = await registerPlayer(api);
    const response = await api.post(`${JUEGO}/iniciar`, undefined, { token });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, "NOT_ENOUGH_BIRDS");
  });
});
