import AppError from "../../errors/AppError.js";

/**
 * Caso de Uso: Actualizar nombre, apellido, rol o estado de un usuario (solo admins, lo controla el router).
 * El email y la contraseña NO se cambian por acá.
 */
async function updateUser(id, changes, { usersDao }) {
  const existing = await usersDao.getById(id);
  if (!existing) {
    throw new AppError("USER_NOT_FOUND", `Usuario ${id} no encontrado`, 404);
  }

  const { nombre, apellido, role, is_active } = changes;
  return usersDao.update(id, {
    // Solo se pisan los campos que vinieron
    ...(nombre !== undefined && { nombre }),
    ...(apellido !== undefined && { apellido }),
    ...(role !== undefined && { role }),
    ...(is_active !== undefined && { is_active }),
    updatedAt: Date.now(),
  });
}

export default updateUser;
