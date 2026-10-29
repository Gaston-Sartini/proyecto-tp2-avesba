import { Sequelize } from "sequelize";
import { DB_STORAGE } from "../config/config.js";

// Conexión a SQLite: la base es un archivo (database.sqlite) dentro del proyecto.
// Con DB_STORAGE=":memory:" la base vive en memoria y se pierde al cerrar (se usa en los tests).
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_STORAGE,
  logging: false, // Cambiar a console.log para ver las queries SQL
});

let ready = null;

/**
 * Prepara la base UNA sola vez (aunque la llamen los tres DAOs):
 * - PRAGMA journal_mode = WAL: SQLite escribe en un archivo aparte y confirma en disco con menos frecuencia.
 *   Sin esto, cada INSERT espera al disco y cargar los datos de prueba tarda ~15 s en vez de ~1 s.
 * - sync(): crea las tablas que falten. En producción no se usa sync: se usan migraciones.
 */
function initDatabase() {
  ready ??= (async () => {
    await sequelize.query("PRAGMA journal_mode = WAL");
    await sequelize.query("PRAGMA synchronous = NORMAL");
    await sequelize.sync();
  })();
  return ready;
}

export { initDatabase };
export default sequelize;
