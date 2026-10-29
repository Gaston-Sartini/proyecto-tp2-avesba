import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PERSISTENCES, startServer, loginAdmin, playerWithRole, emailUnico } from "../helpers.js";

const JUEGO = "/api/inaturalist/juego";

for (const persistence of PERSISTENCES) {
  describe(`Usuarios: crear y eliminar (${persistence})`, () => {
    let api, adminToken;
    before(async () => {
      api = await startServer({ persistence });
      adminToken = await loginAdmin(api);
    });
    after(() => api.close());

    const datosUsuario = (cambios = {}) => ({
      nombre: "Laura",
      apellido: "Ríos",
      email: emailUnico("crud"),
      password: "ClaveSegura123",
      ...cambios,
    });

    describe("POST /users (solo admins)", () => {
      it("crea un usuario con el rol elegido: 201 y sin el hash", async () => {
        const datos = datosUsuario({ role: "moderador" });
        const response = await api.post("/users", datos, { token: adminToken });
        assert.equal(response.status, 201);
        assert.equal(response.body.email, datos.email);
        assert.equal(response.body.role, "moderador");
        assert.equal(response.body.is_active, true);
        assert.equal(response.body.passwordHash, undefined);
        assert.equal(response.body.password, undefined);

        const login = await api.post("/auth/login", { email: datos.email, password: datos.password });
        assert.equal(login.status, 200);
      });

      it("si no se manda el rol, crea un jugador", async () => {
        const response = await api.post("/users", datosUsuario(), { token: adminToken });
        assert.equal(response.body.role, "jugador");
      });

      it("con un email repetido responde 409 EMAIL_DUPLICATED", async () => {
        const datos = datosUsuario();
        await api.post("/users", datos, { token: adminToken });
        const response = await api.post("/users", datos, { token: adminToken });
        assert.equal(response.status, 409);
        assert.equal(response.body.error.code, "EMAIL_DUPLICATED");
      });

      it("con datos inválidos responde 400", async () => {
        const response = await api.post("/users", { nombre: "", email: "x", role: "rey" }, { token: adminToken });
        assert.equal(response.status, 400);
        const campos = response.body.error.details.map((d) => d.field);
        assert.ok(["nombre", "apellido", "email", "password", "role"].every((c) => campos.includes(c)));
      });

      it("un moderador no puede crear usuarios (403) y sin token da 401", async () => {
        const moderador = await playerWithRole(api, "moderador");
        assert.equal((await api.post("/users", datosUsuario(), { token: moderador.token })).status, 403);
        assert.equal((await api.post("/users", datosUsuario())).status, 401);
      });
    });

    describe("DELETE /users/:id (solo admins)", () => {
      it("elimina al usuario: 204 sin cuerpo, y después da 404", async () => {
        const creado = (await api.post("/users", datosUsuario(), { token: adminToken })).body;
        const response = await api.request("DELETE", `/users/${creado.id}`, { token: adminToken });
        assert.equal(response.status, 204);
        assert.equal(response.body, null);
        assert.equal((await api.get(`/users/${creado.id}`, { token: adminToken })).status, 404);
      });

      it("borra también sus partidas y respuestas", async () => {
        const jugador = await playerWithRole(api, "jugador");
        await api.post(`${JUEGO}/iniciar`, undefined, { token: jugador.token });
        const { preguntas, session_id } = (await api.get(`${JUEGO}/sesion`, { token: jugador.token })).body;
        await api.post(`${JUEGO}/respuesta`, { ave_id: preguntas[0].id, respuesta_usuario: preguntas[0].nombre }, { token: jugador.token });

        const response = await api.request("DELETE", `/users/${jugador.id}`, { token: adminToken });
        assert.equal(response.status, 204);
        assert.equal(await api.daos.gameSessionsDao.getById(session_id), null);
        assert.deepEqual(await api.daos.gameResultsDao.getAll({ user_id: jugador.id }), []);
        // Ya no aparece en el ranking
        const ranking = (await api.get(`${JUEGO}/ranking?limit=100`, { token: adminToken })).body.ranking;
        assert.ok(!ranking.some((j) => j.user_id === jugador.id));
      });

      it("un admin no puede eliminarse a sí mismo (409)", async () => {
        const me = (await api.get("/users/me", { token: adminToken })).body;
        const response = await api.request("DELETE", `/users/${me.id}`, { token: adminToken });
        assert.equal(response.status, 409);
        assert.equal(response.body.error.code, "CANNOT_DELETE_SELF");
      });

      it("si no existe responde 404, y si el id no es un número responde 400", async () => {
        assert.equal((await api.request("DELETE", "/users/999999", { token: adminToken })).status, 404);
        assert.equal((await api.request("DELETE", "/users/abc", { token: adminToken })).status, 400);
      });

      it("un jugador no puede eliminar usuarios (403)", async () => {
        const jugador = await playerWithRole(api, "jugador");
        const otro = await playerWithRole(api, "jugador");
        assert.equal((await api.request("DELETE", `/users/${otro.id}`, { token: jugador.token })).status, 403);
      });
    });
  });
}
