import { once } from "node:events";

/**
 * Ayudas compartidas por los tests.
 *
 * IMPORTANTE: la configuración (config/config.js) lee process.env UNA vez, al importarse.
 * Por eso acá primero se cargan las variables de entorno de prueba y recién después,
 * adentro de las funciones, se importa la app con import() dinámico.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "secreto-solo-para-tests";
process.env.NOTIFIER_TYPE = "none"; // los avisos no ensucian la salida
process.env.SEED_PLAYERS = "0"; // sin jugadores de prueba: cada test arma sus datos
process.env.ADMIN_EMAIL = "admin@test.com";
process.env.ADMIN_PASSWORD = "Admin12345";
process.env.BCRYPT_ROUNDS = "4"; // el mínimo: los tests no necesitan hashes lentos
process.env.DB_STORAGE = ":memory:"; // SQLite en memoria: no deja archivos

const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const PERSISTENCES = ["memory", "sequelize"];

// Crea los tres DAOs de la persistencia pedida (el test se queda con la referencia para poder inspeccionarlos)
async function createDaos(persistence) {
  if (persistence === "sequelize") {
    const { default: UsersSequelizeDao } = await import("../dao/users/UsersSequelizeDao.js");
    const { default: GameSessionsSequelizeDao } = await import("../dao/gameSessions/GameSessionsSequelizeDao.js");
    const { default: GameResultsSequelizeDao } = await import("../dao/gameResults/GameResultsSequelizeDao.js");
    return {
      usersDao: new UsersSequelizeDao(),
      gameSessionsDao: new GameSessionsSequelizeDao(),
      gameResultsDao: new GameResultsSequelizeDao(),
    };
  }
  const { default: UsersMemoryDao } = await import("../dao/users/UsersMemoryDao.js");
  const { default: GameSessionsMemoryDao } = await import("../dao/gameSessions/GameSessionsMemoryDao.js");
  const { default: GameResultsMemoryDao } = await import("../dao/gameResults/GameResultsMemoryDao.js");
  return {
    usersDao: new UsersMemoryDao(),
    gameSessionsDao: new GameSessionsMemoryDao(),
    gameResultsDao: new GameResultsMemoryDao(),
  };
}

/**
 * Levanta la app en un puerto libre y devuelve un cliente para hacerle pedidos.
 * Por defecto usa el proveedor de aves falso (15 aves, sin internet).
 */
async function startServer({ persistence = "memory", ...overrides } = {}) {
  const { default: createApp } = await import("../app.js");
  const { createFakeBirdsProvider } = await import("../birds/fakeBirdsProvider.js");

  const daos = await createDaos(persistence);
  const app = await createApp({ birdsProvider: createFakeBirdsProvider(15), ...daos, ...overrides });

  const server = app.listen(0); // 0 = el sistema elige un puerto libre
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(method, path, { body, token, cookie, headers = {} } = {}) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(cookie && { Cookie: cookie }),
        ...headers,
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    let data = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // no era JSON: devolvemos el texto
    }
    return { status: response.status, body: data, headers: response.headers };
  }

  const api = {
    baseUrl,
    daos,
    request,
    get: (path, options) => request("GET", path, options),
    post: (path, body, options) => request("POST", path, { ...options, body }),
    patch: (path, body, options) => request("PATCH", path, { ...options, body }),
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
  return api;
}

// Email distinto en cada llamada: los tests comparten base y no deben chocar entre sí
let contador = 0;
const emailUnico = (prefijo = "jugador") => `${prefijo}.${process.pid}.${Date.now()}.${++contador}@test.com`;

// Registra un jugador y devuelve su token y sus datos
async function registerPlayer(api, data = {}) {
  const user = {
    nombre: "Juan",
    apellido: "Pérez",
    email: emailUnico(),
    password: "SecurePassword123!",
    ...data,
  };
  const response = await api.post("/auth/register", user);
  if (response.status !== 201) {
    throw new Error(`No se pudo registrar el jugador de prueba: ${JSON.stringify(response.body)}`);
  }
  return { ...user, token: response.body.access_token, refreshToken: response.body.refresh_token };
}

async function loginAdmin(api) {
  const response = await api.post("/auth/login", ADMIN);
  return response.body.access_token;
}

// Cambia el rol de un usuario (como admin) y devuelve un token nuevo con ese rol
async function playerWithRole(api, role) {
  const player = await registerPlayer(api);
  const me = await api.get("/users/me", { token: player.token });
  const adminToken = await loginAdmin(api);
  await api.patch(`/users/${me.body.id}`, { role }, { token: adminToken });
  const login = await api.post("/auth/login", { email: player.email, password: player.password });
  return { ...player, id: me.body.id, token: login.body.access_token };
}

export { ADMIN, PERSISTENCES, startServer, createDaos, registerPlayer, loginAdmin, playerWithRole, emailUnico };
