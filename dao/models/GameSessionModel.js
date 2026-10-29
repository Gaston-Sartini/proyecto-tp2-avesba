import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../connection/index.js";

/**
 * Una partida (sesión de juego) de un usuario.
 * Mientras está "activa" guarda el lote de 10 preguntas y la racha actual.
 * Al terminarse guarda el resumen (puntos, intentos, aciertos).
 */
class GameSessionModel extends Model {}

GameSessionModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // user_id lo conecta la asociación (ver models/index.js)
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "activa",
      validate: {
        isIn: { args: [["activa", "terminada"]], msg: "El estado debe ser 'activa' o 'terminada'" },
      },
    },
    // Lote de 10 preguntas (incluye la respuesta correcta). JSON: Sequelize lo guarda como texto y lo devuelve como array
    preguntas: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    locale: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    streak_actual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    streak_maximo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Resumen: se completa al terminar la partida
    puntos_totales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_intentos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_aciertos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    terminadaAt: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = partida todavía activa
    },
  },
  {
    sequelize,
    modelName: "GameSession",
    tableName: "game_sessions",
    timestamps: false,
  }
);

export default GameSessionModel;
