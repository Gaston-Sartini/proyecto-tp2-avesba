/**
 * Caso de Uso: Crear el administrador inicial.
 * Si todos los que se registran son "jugador", ¿quién crea al primer admin? Se siembra al
 * arrancar, con el email y la contraseña del .env (ADMIN_EMAIL, ADMIN_PASSWORD).
 * Si ya existe no hace nada; si falta la contraseña, avisa y no crea nada.
 */
async function seedAdmin({ email, password }, { usersDao, hasher }) {
  if (!password) {
    console.warn("[seed] Falta ADMIN_PASSWORD en el .env: no se creó el administrador");
    return null;
  }

  const existing = await usersDao.getByEmail(email);
  if (existing) return existing;

  const now = Date.now();
  return usersDao.save({
    nombre: "Admin",
    apellido: "Admin",
    email,
    passwordHash: await hasher.hash(password),
    role: "admin",
    is_active: true,
    createdAt: now,
    updatedAt: now,
    lastLogin: null,
  });
}

export default seedAdmin;
