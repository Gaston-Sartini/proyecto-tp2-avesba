/**
 * Caso de Uso: Listar usuarios activos, paginado y opcionalmente filtrado por rol.
 * (Que solo lo usen moderadores y admins lo controla el router con authorize.)
 * Devuelve la página pedida y los datos para armar la paginación en el front.
 */
async function listUsers({ page, per_page, role }, { usersDao }) {
  const filters = { role, is_active: true };

  const items = await usersDao.getAll({ ...filters, page, limit: per_page });
  const total = await usersDao.count(filters);

  return {
    items,
    total,
    page,
    per_page,
    pages: Math.ceil(total / per_page),
  };
}

export default listUsers;
