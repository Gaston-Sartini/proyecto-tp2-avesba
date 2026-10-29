import bcrypt from "bcryptjs";

/**
 * Hasheador de contraseñas.
 * Se crea en el contenedor y se INYECTA: los casos de uso dependen del contrato
 * { hash, compare }, no de bcryptjs. Si mañana se cambia a argon2, cambia solo este archivo.
 *
 * Usamos la versión asíncrona: el hash es trabajo pesado de CPU y la versión síncrona
 * bloquearía el servidor mientras se registra alguien.
 */
function createPasswordHasher({ rounds }) {
  return {
    hash: (plain) => bcrypt.hash(plain, rounds),
    compare: (plain, hash) => bcrypt.compare(plain, hash),
  };
}

export default createPasswordHasher;
