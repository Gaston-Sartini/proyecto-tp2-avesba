import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PERSISTENCES, startServer, registerPlayer, loginAdmin, playerWithRole } from "../helpers.js";

const CAMPOS_PUBLICOS = ["apellido", "createdAt", "email", "id", "is_active", "lastLogin", "nombre", "role", "updatedAt"];

for (const persistence of PERSISTENCES) {
  describe(`Usuarios (${persistence})`, () => {
    let api;
    before(async () => (api = await startServer({ persistence })));
    after(() => api.close());

    describe("GET /users/me", () => {
      it("sin token responde 401", async () => {
        assert.equal((await api.get("/users/me")).status, 401);
      });

      it("devuelve el perfil del usuario del token, sin el hash de la contraseña", async () => {
        const player = await registerPlayer(api);
        const response = await api.get("/users/me", { token: player.token });
        assert.equal(response.status, 200);
        assert.deepEqual(Object.keys(response.body).sort(), CAMPOS_PUBLICOS);
        assert.equal(response.body.email, player.email);
        assert.equal(response.body.nombre, player.nombre);
        assert.equal(response.body.role, "jugador");
        assert.equal(response.body.is_active, true);
      });
    });

    describe("PATCH /users/me/password", () => {
      it("sin token responde 401", async () => {
        const response = await api.patch("/users/me/password", { current_password: "OldPass123!", new_password: "NewPass123!" });
        assert.equal(response.status, 401);
      });

      it("con la contraseña actual incorrecta responde 400 WRONG_PASSWORD", async () => {
        const player = await registerPlayer(api);
        const response = await api.patch(
          "/users/me/password",
          { current_password: "WrongPassword!", new_password: "NewPass123!" },
          { token: player.token }
        );
        assert.equal(response.status, 400);
        assert.equal(response.body.error.code, "WRONG_PASSWORD");
      });

      it("con una contraseña nueva corta responde 400", async () => {
        const player = await registerPlayer(api);
        const response = await api.patch(
          "/users/me/password",
          { current_password: player.password, new_password: "corta" },
          { token: player.token }
        );
        assert.equal(response.status, 400);
        assert.equal(response.body.error.code, "VALIDATION_ERROR");
      });

      it("cambia la contraseña: la vieja deja de servir y la nueva funciona", async () => {
        const player = await registerPlayer(api);
        const response = await api.patch(
          "/users/me/password",
          { current_password: player.password, new_password: "NuevaClave456" },
          { token: player.token }
        );
        assert.equal(response.status, 200);
        assert.equal(response.body.message, "Contraseña actualizada exitosamente");

        assert.equal((await api.post("/auth/login", { email: player.email, password: player.password })).status, 401);
        assert.equal((await api.post("/auth/login", { email: player.email, password: "NuevaClave456" })).status, 200);
      });
    });

    describe("GET /users (listado)", () => {
      it("un jugador no puede ver el listado (403 con 'Acceso denegado')", async () => {
        const player = await registerPlayer(api);
        const response = await api.get("/users", { token: player.token });
        assert.equal(response.status, 403);
        assert.match(response.body.detail, /Acceso denegado/);
      });

      it("un admin ve el listado paginado", async () => {
        await registerPlayer(api);
        await registerPlayer(api);
        const token = await loginAdmin(api);
        const response = await api.get("/users?page=1&per_page=2", { token });
        assert.equal(response.status, 200);
        assert.equal(response.body.items.length, 2);
        assert.equal(response.body.page, 1);
        assert.equal(response.body.per_page, 2);
        assert.equal(response.body.pages, Math.ceil(response.body.total / 2));
        for (const user of response.body.items) assert.equal(user.passwordHash, undefined);
      });

      it("un moderador también ve el listado y puede filtrar por rol", async () => {
        const moderador = await playerWithRole(api, "moderador");
        const response = await api.get("/users?role=moderador", { token: moderador.token });
        assert.equal(response.status, 200);
        assert.ok(response.body.items.length >= 1);
        assert.ok(response.body.items.every((u) => u.role === "moderador"));
      });

      it("no muestra a los usuarios dados de baja", async () => {
        const player = await playerWithRole(api, "jugador");
        const token = await loginAdmin(api);
        await api.patch(`/users/${player.id}`, { is_active: false }, { token });
        const response = await api.get("/users?per_page=100", { token });
        assert.ok(!response.body.items.some((u) => u.id === player.id));
      });

      it("con parámetros inválidos responde 400", async () => {
        const token = await loginAdmin(api);
        assert.equal((await api.get("/users?per_page=500", { token })).status, 400);
        assert.equal((await api.get("/users?role=superadmin", { token })).status, 400);
      });
    });

    describe("GET /users/:id", () => {
      it("un jugador puede verse a sí mismo", async () => {
        const player = await playerWithRole(api, "jugador");
        const response = await api.get(`/users/${player.id}`, { token: player.token });
        assert.equal(response.status, 200);
        assert.equal(response.body.email, player.email);
      });

      it("un jugador NO puede ver a otro (403)", async () => {
        const uno = await playerWithRole(api, "jugador");
        const otro = await playerWithRole(api, "jugador");
        const response = await api.get(`/users/${otro.id}`, { token: uno.token });
        assert.equal(response.status, 403);
      });

      it("un moderador puede ver a cualquiera", async () => {
        const moderador = await playerWithRole(api, "moderador");
        const otro = await playerWithRole(api, "jugador");
        assert.equal((await api.get(`/users/${otro.id}`, { token: moderador.token })).status, 200);
      });

      it("si no existe responde 404, y si el id no es un número responde 400", async () => {
        const token = await loginAdmin(api);
        assert.equal((await api.get("/users/999999", { token })).status, 404);
        assert.equal((await api.get("/users/abc", { token })).status, 400);
      });
    });

    describe("PATCH /users/:id (solo admins)", () => {
      it("un admin actualiza nombre, apellido y rol", async () => {
        const player = await playerWithRole(api, "jugador");
        const token = await loginAdmin(api);
        const response = await api.patch(`/users/${player.id}`, { nombre: "Juana", apellido: "García", role: "moderador" }, { token });
        assert.equal(response.status, 200);
        assert.equal(response.body.nombre, "Juana");
        assert.equal(response.body.apellido, "García");
        assert.equal(response.body.role, "moderador");
        assert.equal(response.body.email, player.email);
      });

      it("un jugador no puede actualizar usuarios (403)", async () => {
        const player = await playerWithRole(api, "jugador");
        const response = await api.patch(`/users/${player.id}`, { role: "admin" }, { token: player.token });
        assert.equal(response.status, 403);
      });

      it("con un rol inválido responde 400 y con un id inexistente 404", async () => {
        const token = await loginAdmin(api);
        const player = await playerWithRole(api, "jugador");
        assert.equal((await api.patch(`/users/${player.id}`, { role: "rey" }, { token })).status, 400);
        assert.equal((await api.patch("/users/999999", { nombre: "X" }, { token })).status, 404);
      });
    });

    describe("POST /users/:id/reset-password (solo admins)", () => {
      it("genera una contraseña nueva con la que el usuario puede entrar", async () => {
        const player = await playerWithRole(api, "jugador");
        const token = await loginAdmin(api);
        const response = await api.post(`/users/${player.id}/reset-password`, undefined, { token });
        assert.equal(response.status, 200);
        assert.equal(response.body.user_id, player.id);
        assert.equal(response.body.new_password.length, 12);

        const login = await api.post("/auth/login", { email: player.email, password: response.body.new_password });
        assert.equal(login.status, 200);
      });

      it("un moderador no puede resetear contraseñas (403)", async () => {
        const moderador = await playerWithRole(api, "moderador");
        const response = await api.post(`/users/${moderador.id}/reset-password`, undefined, { token: moderador.token });
        assert.equal(response.status, 403);
      });
    });
  });
}
