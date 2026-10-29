import { sequelize } from "../../connection/index.js";
import UserModel from "./UserModel.js";
import GameSessionModel from "./GameSessionModel.js";
import GameResultModel from "./GameResultModel.js";

// -----------------------------------------------------------------------------
// DEFINICIÓN DE RELACIONES (ASOCIACIONES)
// -----------------------------------------------------------------------------
// Acá centralizamos cómo se relacionan las tablas entre sí.
// Documentación de Sequelize: https://sequelize.org/docs/v6/core-concepts/assocs/

// Relación 1 a N: un usuario juega muchas partidas; cada partida es de un usuario
UserModel.hasMany(GameSessionModel, { foreignKey: "user_id", as: "sesiones" });
GameSessionModel.belongsTo(UserModel, { foreignKey: "user_id", as: "usuario" });

// Relación 1 a N: una partida tiene muchas respuestas; cada respuesta es de una partida
GameSessionModel.hasMany(GameResultModel, { foreignKey: "session_id", as: "respuestas" });
GameResultModel.belongsTo(GameSessionModel, { foreignKey: "session_id", as: "sesion" });

// Relación 1 a N: un usuario tiene muchas respuestas (atajo para el ranking y las métricas)
UserModel.hasMany(GameResultModel, { foreignKey: "user_id", as: "respuestas" });
GameResultModel.belongsTo(UserModel, { foreignKey: "user_id", as: "usuario" });

// Exportamos la instancia de sequelize (para poder hacer sync) y todos los modelos
export { sequelize, UserModel, GameSessionModel, GameResultModel };
