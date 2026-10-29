import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../connection/index.js";

const ROLES = ["jugador", "moderador", "admin"];

class UserModel extends Model {}

UserModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false, // Constraint a nivel BD
      validate: {
        notEmpty: { msg: "El nombre es obligatorio" }, // Validación a nivel ORM
      },
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: "El apellido es obligatorio" },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: "Debe ser un correo electrónico válido" },
      },
    },
    // Nunca la contraseña: solo su hash de bcrypt (empieza con "$2")
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "jugador",
      validate: {
        isIn: {
          args: [ROLES],
          msg: "El rol debe ser 'jugador', 'moderador' o 'admin'",
        },
      },
    },
    // Baja lógica: un usuario inactivo no puede loguearse, pero sus partidas se conservan
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // Fechas como milisegundos (Date.now()), igual que el backend de Python
    createdAt: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lastLogin: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: false, // las fechas las maneja la app (en milisegundos), no Sequelize
  }
);

export default UserModel;
