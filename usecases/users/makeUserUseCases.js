import getProfile from "./getProfile.js";
import getUserById from "./getUserById.js";
import listUsers from "./listUsers.js";
import updateUser from "./updateUser.js";
import changePassword from "./changePassword.js";
import resetPassword from "./resetPassword.js";

/**
 * Factory de Casos de Uso de Usuarios.
 * `actor` es el usuario logueado ({ id, role }) que el controlador saca de req.user.
 */
function makeUserUseCases({ usersDao, hasher }) {
  return {
    getProfile: (actor) => getProfile(actor, { usersDao }),
    getUserById: (id, actor) => getUserById(id, actor, { usersDao }),
    listUsers: (filters) => listUsers(filters, { usersDao }),
    updateUser: (id, changes) => updateUser(id, changes, { usersDao }),
    changePassword: (actor, data) => changePassword(actor, data, { usersDao, hasher }),
    resetPassword: (id) => resetPassword(id, { usersDao, hasher }),
  };
}

export default makeUserUseCases;
