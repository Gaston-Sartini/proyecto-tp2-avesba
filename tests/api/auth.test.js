import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PERSISTENCES, ADMIN, startServer, registerPlayer, emailUnico } from "../helpers.js";

// Cookies que mandó el servidor, como un objeto { nombre: "valor; atributos" }
const cookiesDe = (response) =>
  Object.fromEntries(response.headers.getSetCookie().map((cookie) => [cookie.split("=")[0], cookie]));

for (const persistence of PERSISTENCES) {
  describe(`Autenticación (${persistence})`, () => {
    let api;
    before(async () => (api = await startServer({ persistence })));
    after(() => api.close());

    describe("POST /auth/register", () => {
      it("registra un jugador: 201 con access y refresh token", async () => {
        const response = await api.post("/auth/register", {
          nombre: "Juan",
          apellido: "Pérez",
          email: emailUnico(),
          password: "SecurePassword123!",
        });
        assert.equal(response.status, 201);
        assert.ok(response.body.access_token);
        assert.ok(response.body.refresh_token);
        assert.equal(response.body.token_type, "bearer");
        assert.equal(response.body.expires_in, 900);
      });

      it("deja los tokens en cookies httpOnly (las usa el front)", async () => {
        const response = await api.post("/auth/register", {
          nombre: "Ana",
          apellido: "Gómez",
          email: emailUnico(),
          password: "SecurePassword123!",
        });
        const cookies = cookiesDe(response);
        assert.match(cookies.access_token, /HttpOnly/);
        assert.match(cookies.refresh_token, /HttpOnly/);
        assert.match(cookies.access_token, /SameSite=Lax/);
      });

      it("con un email ya registrado responde 409 EMAIL_DUPLICATED", async () => {
        const player = await registerPlayer(api);
        const response = await api.post("/auth/register", {
          nombre: "Pedro",
          apellido: "González",
          email: player.email,
          password: "SecurePassword123!",
        });
        assert.equal(response.status, 409);
        assert.equal(response.body.error.code, "EMAIL_DUPLICATED");
        assert.match(response.body.detail, /ya está registrado/);
      });

      it("con una contraseña corta responde 400 con el detalle del campo", async () => {
        const response = await api.post("/auth/register", {
          nombre: "Juan",
          apellido: "Pérez",
          email: emailUnico(),
          password: "short",
        });
        assert.equal(response.status, 400);
        assert.equal(response.body.error.code, "VALIDATION_ERROR");
        assert.equal(response.body.error.details[0].field, "password");
      });

      it("con datos faltantes o email inválido responde 400", async () => {
        const response = await api.post("/auth/register", { email: "no-es-un-email" });
        assert.equal(response.status, 400);
        const campos = response.body.error.details.map((d) => d.field);
        assert.ok(["nombre", "apellido", "email", "password"].every((campo) => campos.includes(campo)));
      });

      it("ignora el rol que mande el cliente: siempre crea un jugador", async () => {
        const email = emailUnico();
        const response = await api.post("/auth/register", {
          nombre: "Pícaro",
          apellido: "Hacker",
          email,
          password: "SecurePassword123!",
          role: "admin",
        });
        const me = await api.get("/users/me", { token: response.body.access_token });
        assert.equal(me.body.role, "jugador");
      });
    });

    describe("POST /auth/login", () => {
      it("con credenciales correctas responde 200 con los tokens", async () => {
        const player = await registerPlayer(api);
        const response = await api.post("/auth/login", { email: player.email, password: player.password });
        assert.equal(response.status, 200);
        assert.ok(response.body.access_token);
        assert.ok(response.body.refresh_token);
        assert.equal(response.body.mensaje, "Inicio de sesión exitoso");
        assert.ok(cookiesDe(response).access_token);
      });

      it("el admin sembrado desde el .env puede entrar", async () => {
        const response = await api.post("/auth/login", ADMIN);
        assert.equal(response.status, 200);
        const me = await api.get("/users/me", { token: response.body.access_token });
        assert.equal(me.body.role, "admin");
      });

      it("con un email inexistente responde 401 INVALID_CREDENTIALS", async () => {
        const response = await api.post("/auth/login", { email: "nonexistent@example.com", password: "WrongPassword123!" });
        assert.equal(response.status, 401);
        assert.equal(response.body.error.code, "INVALID_CREDENTIALS");
      });

      it("con la contraseña mal responde el MISMO error que con un email inexistente", async () => {
        const player = await registerPlayer(api);
        const response = await api.post("/auth/login", { email: player.email, password: "otraClave123" });
        assert.equal(response.status, 401);
        assert.equal(response.body.error.code, "INVALID_CREDENTIALS");
      });

      it("registra la fecha del último login", async () => {
        const player = await registerPlayer(api);
        const antes = (await api.get("/users/me", { token: player.token })).body.lastLogin;
        const login = await api.post("/auth/login", { email: player.email, password: player.password });
        const despues = (await api.get("/users/me", { token: login.body.access_token })).body.lastLogin;
        assert.equal(antes, null);
        assert.equal(typeof despues, "number");
      });

      it("después de 5 intentos fallidos bloquea el login con 429, aunque la clave sea correcta", async () => {
        const player = await registerPlayer(api);
        for (let i = 0; i < 5; i++) {
          const fallido = await api.post("/auth/login", { email: player.email, password: "incorrecta" });
          assert.equal(fallido.status, 401);
        }
        const bloqueado = await api.post("/auth/login", { email: player.email, password: player.password });
        assert.equal(bloqueado.status, 429);
        assert.equal(bloqueado.body.error.code, "TOO_MANY_ATTEMPTS");
      });

      it("un usuario dado de baja no puede entrar (401 USER_INACTIVE)", async () => {
        const player = await registerPlayer(api);
        const me = await api.get("/users/me", { token: player.token });
        const admin = await api.post("/auth/login", ADMIN);
        await api.patch(`/users/${me.body.id}`, { is_active: false }, { token: admin.body.access_token });

        const response = await api.post("/auth/login", { email: player.email, password: player.password });
        assert.equal(response.status, 401);
        assert.equal(response.body.error.code, "USER_INACTIVE");
      });
    });

    describe("POST /auth/refresh", () => {
      it("con el refresh_token en el body devuelve tokens nuevos", async () => {
        const player = await registerPlayer(api);
        const response = await api.post("/auth/refresh", { refresh_token: player.refreshToken });
        assert.equal(response.status, 200);
        assert.ok(response.body.access_token);
        const me = await api.get("/users/me", { token: response.body.access_token });
        assert.equal(me.status, 200);
      });

      it("también funciona con el refresh_token en la cookie", async () => {
        const player = await registerPlayer(api);
        const response = await api.request("POST", "/auth/refresh", { cookie: `refresh_token=${player.refreshToken}` });
        assert.equal(response.status, 200);
        assert.ok(response.body.access_token);
      });

      it("un access token no sirve como refresh token (401)", async () => {
        const player = await registerPlayer(api);
        const response = await api.post("/auth/refresh", { refresh_token: player.token });
        assert.equal(response.status, 401);
        assert.equal(response.body.error.code, "TOKEN_INVALID");
      });

      it("un refresh token no sirve para entrar a la API (401)", async () => {
        const player = await registerPlayer(api);
        const response = await api.get("/users/me", { token: player.refreshToken });
        assert.equal(response.status, 401);
      });

      it("sin refresh token responde 401 TOKEN_MISSING", async () => {
        const response = await api.post("/auth/refresh", {});
        assert.equal(response.status, 401);
        assert.equal(response.body.error.code, "TOKEN_MISSING");
      });
    });

    describe("POST /auth/logout", () => {
      it("borra las cookies de autenticación", async () => {
        const response = await api.post("/auth/logout", {});
        assert.equal(response.status, 200);
        assert.equal(response.body.mensaje, "Sesión cerrada exitosamente");
        const cookies = cookiesDe(response);
        assert.match(cookies.access_token, /Expires=Thu, 01 Jan 1970/);
        assert.match(cookies.refresh_token, /Expires=Thu, 01 Jan 1970/);
      });
    });

    describe("Token en las peticiones", () => {
      it("sin token responde 401 TOKEN_MISSING", async () => {
        const response = await api.get("/users/me");
        assert.equal(response.status, 401);
        assert.equal(response.body.error.code, "TOKEN_MISSING");
      });

      it("acepta el token en la cookie access_token (como lo manda el front)", async () => {
        const player = await registerPlayer(api);
        const response = await api.get("/users/me", { cookie: `access_token=${player.token}` });
        assert.equal(response.status, 200);
        assert.equal(response.body.email, player.email);
      });

      it("un token modificado responde 401 TOKEN_INVALID", async () => {
        const player = await registerPlayer(api);
        const [header, , firma] = player.token.split(".");
        const payload = Buffer.from(JSON.stringify({ sub: "1", role: "admin", type: "access" })).toString("base64url");
        const response = await api.get("/users/me", { token: `${header}.${payload}.${firma}` });
        assert.equal(response.status, 401);
        assert.equal(response.body.error.code, "TOKEN_INVALID");
      });
    });
  });
}
