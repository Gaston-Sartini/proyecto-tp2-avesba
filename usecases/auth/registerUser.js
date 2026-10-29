import createUser from "../users/createUser.js";
import issueTokens from "./issueTokens.js";

/**
 * Caso de Uso: Registrar un jugador nuevo (endpoint público).
 * Reutiliza createUser (email duplicado, hasheo, evento) pero FUERZA el rol "jugador":
 * si un endpoint público dejara elegir el rol, cualquiera se registraría como admin
 * (escalada de privilegios). Devuelve los tokens para que quede logueado.
 */
async function registerUser({ nombre, apellido, email, password }, { usersDao, hasher, tokens, events }) {
  const user = await createUser({ nombre, apellido, email, password, role: "jugador" }, { usersDao, hasher, events });
  return issueTokens(user, tokens);
}

export default registerUser;
