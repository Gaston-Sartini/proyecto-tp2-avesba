import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { PERSISTENCES, createDaos, emailUnico } from "../helpers.js";

/**
 * Test de CONTRATO: los dos adaptadores (memoria y Sequelize) tienen que comportarse igual.
 * Es lo que permite cambiar PERSISTENCE_TYPE sin tocar los casos de uso.
 */
const nuevoUsuario = (cambios = {}) => ({
  nombre: "Ana",
  apellido: "García",
  email: emailUnico("dao"),
  passwordHash: "$2a$04$hashfalso",
  role: "jugador",
  is_active: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastLogin: null,
  ...cambios,
});

for (const persistence of PERSISTENCES) {
  describe(`DAOs (${persistence})`, () => {
    let usersDao, gameSessionsDao, gameResultsDao;

    before(async () => {
      ({ usersDao, gameSessionsDao, gameResultsDao } = await createDaos(persistence));
      for (const dao of [usersDao, gameSessionsDao, gameResultsDao]) await dao.init?.();
    });

    describe("Usuarios", () => {
      it("save asigna id, ignora el id que venga y NO devuelve el hash", async () => {
        const user = await usersDao.save(nuevoUsuario({ id: 9999 }));
        assert.ok(Number.isInteger(user.id));
        assert.notEqual(user.id, 9999);
        assert.equal(user.passwordHash, undefined);
        assert.equal(user.is_active, true);
        assert.equal(typeof user.createdAt, "number");
      });

      it("getById, getByEmail, getAll y update nunca devuelven el hash", async () => {
        const { id, email } = await usersDao.save(nuevoUsuario());
        const lecturas = [
          await usersDao.getById(id),
          await usersDao.getByEmail(email),
          await usersDao.update(id, { nombre: "Otra" }),
          ...(await usersDao.getAll()),
        ];
        for (const user of lecturas) assert.equal(user.passwordHash, undefined);
      });

      it("getCredentialsByEmail es el único que trae el hash", async () => {
        const data = nuevoUsuario();
        await usersDao.save(data);
        const credenciales = await usersDao.getCredentialsByEmail(data.email);
        assert.equal(credenciales.passwordHash, data.passwordHash);
        assert.equal(await usersDao.getCredentialsByEmail("noexiste@test.com"), null);
      });

      it("getAll y count filtran por rol y estado, y getAll pagina", async () => {
        const moderadores = [];
        for (let i = 0; i < 3; i++) moderadores.push(await usersDao.save(nuevoUsuario({ role: "moderador" })));
        await usersDao.save(nuevoUsuario({ role: "moderador", is_active: false }));

        const activos = await usersDao.getAll({ role: "moderador", is_active: true });
        assert.ok(activos.every((u) => u.role === "moderador" && u.is_active === true));
        assert.equal(await usersDao.count({ role: "moderador", is_active: true }), activos.length);

        const pagina = await usersDao.getAll({ role: "moderador", is_active: true, page: 1, limit: 2 });
        assert.equal(pagina.length, 2);
      });

      it("update devuelve null si el usuario no existe y no deja cambiar el id", async () => {
        assert.equal(await usersDao.update(987654, { nombre: "X" }), null);
        const { id } = await usersDao.save(nuevoUsuario());
        const actualizado = await usersDao.update(id, { id: 5555, is_active: false });
        assert.equal(actualizado.id, id);
        assert.equal(actualizado.is_active, false);
      });

      it("delete devuelve true si lo borró y false si no existía", async () => {
        const { id } = await usersDao.save(nuevoUsuario());
        assert.equal(await usersDao.delete(id), true);
        assert.equal(await usersDao.getById(id), null);
        assert.equal(await usersDao.delete(id), false);
      });
    });

    describe("Listado de partidas", () => {
      it("getAll filtra, ordena y pagina igual; count y delete funcionan", async () => {
        const { id: userId } = await usersDao.save(nuevoUsuario());
        for (const [puntos, estado] of [
          [30, "terminada"],
          [10, "terminada"],
          [20, "activa"],
        ]) {
          await gameSessionsDao.create({ user_id: userId, estado, puntos_totales: puntos, createdAt: puntos });
        }

        const porPuntos = await gameSessionsDao.getAll({ user_id: userId, sort: "-puntos_totales" });
        assert.deepEqual(
          porPuntos.map((s) => s.puntos_totales),
          [30, 20, 10]
        );

        const terminadas = await gameSessionsDao.getAll({ user_id: userId, estado: "terminada", sort: "createdAt" });
        assert.deepEqual(
          terminadas.map((s) => s.puntos_totales),
          [10, 30]
        );
        assert.equal(await gameSessionsDao.count({ user_id: userId, estado: "terminada" }), 2);

        const pagina2 = await gameSessionsDao.getAll({ user_id: userId, sort: "createdAt", page: 2, limit: 2 });
        assert.deepEqual(
          pagina2.map((s) => s.puntos_totales),
          [30]
        );

        assert.equal(await gameSessionsDao.delete(porPuntos[0].id), true);
        assert.equal(await gameSessionsDao.delete(porPuntos[0].id), false);
        assert.equal(await gameSessionsDao.count({ user_id: userId }), 2);
      });
    });

    describe("Borrados en cascada", () => {
      it("deleteBySession y deleteByUser borran solo lo de esa partida o ese usuario", async () => {
        const { id: uno } = await usersDao.save(nuevoUsuario());
        const { id: otro } = await usersDao.save(nuevoUsuario());
        const partidaUno = await gameSessionsDao.create({ user_id: uno, estado: "terminada", createdAt: 1 });
        const partidaOtro = await gameSessionsDao.create({ user_id: otro, estado: "terminada", createdAt: 1 });
        const respuesta = (user_id, session_id) => ({
          user_id,
          session_id,
          ave_id: 1,
          ave_nombre: "A",
          respuesta_usuario: "A",
          es_correcta: true,
          createdAt: 1,
        });
        await gameResultsDao.saveMany([respuesta(uno, partidaUno.id), respuesta(otro, partidaOtro.id)]);

        assert.equal(await gameResultsDao.deleteBySession(partidaUno.id), 1);
        assert.equal((await gameResultsDao.getAll({ user_id: otro })).length, 1);

        assert.equal(await gameResultsDao.deleteByUser(otro), 1);
        assert.equal(await gameSessionsDao.deleteByUser(uno), 1);
        assert.equal(await gameSessionsDao.getById(partidaUno.id), null);
        assert.notEqual(await gameSessionsDao.getById(partidaOtro.id), null);
      });
    });

    describe("Partidas y respuestas", () => {
      it("guarda el lote de preguntas y lo devuelve igual (como array)", async () => {
        const preguntas = [{ id: 1, nombre: "Tero", opciones: [{ id: 1, nombre: "Tero" }] }];
        const { id: userId } = await usersDao.save(nuevoUsuario());
        const session = await gameSessionsDao.create({
          user_id: userId,
          estado: "activa",
          preguntas,
          place_id: 10434,
          locale: "es-AR",
          createdAt: Date.now(),
        });
        assert.deepEqual((await gameSessionsDao.getById(session.id)).preguntas, preguntas);
        assert.equal(session.terminadaAt, null);
        assert.equal(session.streak_actual, 0);
      });

      it("getActiveByUser solo encuentra partidas activas de ese usuario", async () => {
        const { id: userId } = await usersDao.save(nuevoUsuario());
        assert.equal(await gameSessionsDao.getActiveByUser(userId), null);

        const session = await gameSessionsDao.create({ user_id: userId, estado: "activa", createdAt: Date.now() });
        assert.equal((await gameSessionsDao.getActiveByUser(userId)).id, session.id);
        assert.equal((await gameSessionsDao.getAllActiveByUser(userId)).length, 1);

        await gameSessionsDao.update(session.id, { estado: "terminada", terminadaAt: Date.now() });
        assert.equal(await gameSessionsDao.getActiveByUser(userId), null);
        assert.deepEqual(await gameSessionsDao.getAllActiveByUser(userId), []);
      });

      it("las respuestas se devuelven en orden y se pueden buscar por ave", async () => {
        const { id: userId } = await usersDao.save(nuevoUsuario());
        const session = await gameSessionsDao.create({ user_id: userId, estado: "activa", createdAt: Date.now() });
        const base = {
          user_id: userId,
          session_id: session.id,
          respuesta_usuario: "X",
          es_correcta: true,
          puntos_obtenidos: 10,
          bonus_racha: 0,
          streak_en_respuesta: 1,
        };
        await gameResultsDao.save({ ...base, ave_id: 2, ave_nombre: "B", createdAt: 2000 });
        await gameResultsDao.saveMany([{ ...base, ave_id: 1, ave_nombre: "A", createdAt: 1000 }]);

        const respuestas = await gameResultsDao.getBySession(session.id);
        assert.deepEqual(
          respuestas.map((r) => r.ave_id),
          [1, 2]
        );
        assert.equal(respuestas[0].es_correcta, true);
        assert.equal((await gameResultsDao.findInSession(session.id, 2)).ave_nombre, "B");
        assert.equal(await gameResultsDao.findInSession(session.id, 3), null);
        assert.ok((await gameResultsDao.getAll({ user_id: userId })).length === 2);
      });
    });
  });
}
