import sequelize, { initDatabase } from "./sequelize.js";

/**
 * Punto único de acceso a las conexiones.
 * Para agregar otra (ej: mongoose, pg, redis) se crea su archivo en esta carpeta y se exporta acá.
 */
export { sequelize, initDatabase };
