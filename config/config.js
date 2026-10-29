/**
 * Módulo centralizado de configuración de la aplicación.
 * Lee las variables de entorno desde process.env (cargadas vía --env-file)
 * y exporta constantes con valores por defecto.
 * Es el ÚNICO archivo que lee process.env: el resto del código importa de acá.
 */

// --- Aplicación ---
const PORT = Number(process.env.PORT) || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";
const APP_NAME = process.env.APP_NAME || "AvesBA API";
const APP_VERSION = process.env.APP_VERSION || "1.0.0";

// Orígenes que pueden llamar a la API desde el navegador (el front de Vite corre en el 5173)
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origen) => origen.trim());

// --- Persistencia (clase 9) ---
const PERSISTENCE_TYPE = process.env.PERSISTENCE_TYPE || "memory"; // "memory" o "sequelize"
const DB_STORAGE = process.env.DB_STORAGE || "./database.sqlite"; // ":memory:" para no guardar nada en disco

// --- Eventos y notificaciones (clase 10) ---
const NOTIFIER_TYPE = process.env.NOTIFIER_TYPE || "console"; // "console", "file" o "none"

// --- Aves (clase 12: API externa) ---
const BIRDS_PROVIDER = process.env.BIRDS_PROVIDER || "inaturalist"; // "inaturalist" o "fake" (sin internet)

// --- Seguridad (clase 11) ---
// El secreto NO tiene valor por defecto: si alguien olvida configurarlo en producción,
// la app firmaría tokens con un secreto conocido por todos y cualquiera podría fabricarse
// un token de admin. Preferimos que la app no arranque a que arranque insegura.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Falta JWT_SECRET en el .env: la aplicación no puede arrancar sin un secreto para firmar los tokens");
}

const ACCESS_TOKEN_EXPIRE_MINUTES = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES) || 15;
const REFRESH_TOKEN_EXPIRE_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS) || 7;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

// Bloqueo del login: después de N intentos fallidos con el mismo email, se bloquea por X minutos
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES) || 15;

// --- Datos semilla ---
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@avesba.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // sin valor por defecto: si falta, no se crea el admin
const SEED_PLAYERS = Number(process.env.SEED_PLAYERS ?? 100); // 0 = no cargar jugadores de prueba
const SEED_PLAYERS_PASSWORD = process.env.SEED_PLAYERS_PASSWORD || "Jugador123";

export {
  PORT,
  NODE_ENV,
  IS_PRODUCTION,
  APP_NAME,
  APP_VERSION,
  CORS_ORIGIN,
  PERSISTENCE_TYPE,
  DB_STORAGE,
  NOTIFIER_TYPE,
  BIRDS_PROVIDER,
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRE_MINUTES,
  REFRESH_TOKEN_EXPIRE_DAYS,
  BCRYPT_ROUNDS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_MINUTES,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  SEED_PLAYERS,
  SEED_PLAYERS_PASSWORD,
};
