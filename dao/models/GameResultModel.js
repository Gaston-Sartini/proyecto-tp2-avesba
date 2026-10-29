import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../connection/index.js";

/**
 * Una respuesta del jugador a una pregunta (un ave) dentro de una partida.
 * De esta tabla salen el ranking y todas las métricas.
 */
class GameResultModel extends Model {}

GameResultModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // user_id y session_id los conectan las asociaciones (ver models/index.js)
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ave_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ave_nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    respuesta_usuario: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    es_correcta: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    puntos_obtenidos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Puntos extra por racha (3, 5 o 10 aciertos seguidos)
    bonus_racha: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Racha que tenía el jugador después de responder
    streak_en_respuesta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "GameResult",
    tableName: "game_results",
    timestamps: false,
  }
);

export default GameResultModel;
