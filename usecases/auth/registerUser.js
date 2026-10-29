import AppError from "../../errors/AppError.js";
import EVENTS from "../../events/eventNames.js";
import issueTokens from "./issueTokens.js";

/**
 * Caso de Uso: Registrar un jugador nuevo.
 * Reglas de negocio:
 *  - El email no puede estar duplicado.
 *  - El rol SIEMPRE es "jugador" (se ignora cualquier rol que mande el cliente).
 *  - La contraseña se guarda hasheada, nunca en texto plano.
 * Efecto secundario desacoplado: emite "user.registered" (ej. mail de bienvenida).
 */
async function registerUser({ nombre, apellido, email, password }, { usersDao, hasher, tokens, events }) {
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
    role: "jugador",
    is_active: true,
    createdAt: now,
    updatedAt: now,
    lastLogin: null,
  });

  events.emit(EVENTS.USER_REGISTERED, { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email });

  return issueTokens(user, tokens);
}

export default registerUser;
