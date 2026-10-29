import AppError from "../../errors/AppError.js";
import EVENTS from "../../events/eventNames.js";

/**
 * Caso de Uso: Crear un usuario.
 * Lo usan el admin (POST /users, elige el rol) y el registro público (registerUser, que fuerza "jugador").
 * Reglas de negocio:
 *  - El email no puede estar duplicado.
 *  - La contraseña se guarda hasheada, nunca en texto plano.
 * Efecto secundario desacoplado: emite "user.registered" (ej. mail de bienvenida).
 */
async function createUser({ nombre, apellido, email, password, role = "jugador" }, { usersDao, hasher, events }) {
  const existing = await usersDao.getByEmail(email);
  if (existing) {
    throw new AppError("EMAIL_DUPLICATED", `El email ${email} ya está registrado`, 409);
  }

  const now = Date.now();
  const user = await usersDao.save({
    nombre,
    apellido,
    email,
    passwordHash: await hasher.hash(password),
    role,
    is_active: true,
    createdAt: now,
    updatedAt: now,
    lastLogin: null,
  });

  events.emit(EVENTS.USER_REGISTERED, { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email });

  return user;
}

export default createUser;
