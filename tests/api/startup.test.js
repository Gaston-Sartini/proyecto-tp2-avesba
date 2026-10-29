import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Tests de arranque: corren la app en un proceso aparte con distintas variables de entorno,
 * porque la configuración se lee una sola vez al arrancar.
 */
const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

function correr(codigo, env) {
  const resultado = spawnSync(process.execPath, ["--input-type=module", "-e", codigo], {
    cwd: RAIZ,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: "test", NOTIFIER_TYPE: "none", ...env },
    encoding: "utf8",
    timeout: 60_000,
  });
  return { code: resultado.status, salida: resultado.stdout + resultado.stderr };
}

describe("Arranque de la aplicación", () => {
  it("sin JWT_SECRET la aplicación se niega a arrancar", () => {
    const { code, salida } = correr(`await import("./config/config.js");`, {});
    assert.notEqual(code, 0);
    assert.match(salida, /Falta JWT_SECRET/);
  });

  it("carga el admin y los jugadores de prueba con partidas (y no los duplica al rearrancar)", () => {
    const codigo = `
      const { default: createApp } = await import("./app.js");
      const { createFakeBirdsProvider } = await import("./birds/fakeBirdsProvider.js");
      const { UserModel, GameSessionModel, GameResultModel } = await import("./dao/models/index.js");
      await createApp({ birdsProvider: createFakeBirdsProvider() });
      await createApp({ birdsProvider: createFakeBirdsProvider() });
      const moderadores = await UserModel.count({ where: { role: "moderador" } });
      const admins = await UserModel.count({ where: { role: "admin" } });
      console.log(JSON.stringify({
        usuarios: await UserModel.count(),
        admins,
        moderadores,
        sesiones: await GameSessionModel.count(),
        respuestas: await GameResultModel.count(),
      }));
    `;
    const { code, salida } = correr(codigo, {
      JWT_SECRET: "x",
      PERSISTENCE_TYPE: "sequelize",
      DB_STORAGE: ":memory:",
      ADMIN_EMAIL: "admin@test.com",
      ADMIN_PASSWORD: "Admin12345",
      SEED_PLAYERS: "5",
      BCRYPT_ROUNDS: "4",
    });
    assert.equal(code, 0, salida);
    const datos = JSON.parse(salida.trim().split("\n").at(-1));
    assert.equal(datos.usuarios, 6); // 1 admin + 5 jugadores
    assert.equal(datos.admins, 1);
    assert.equal(datos.moderadores, 3);
    assert.ok(datos.sesiones >= 5 && datos.sesiones <= 25);
    assert.equal(datos.respuestas, datos.sesiones * 10);
  });

  it("sin ADMIN_PASSWORD avisa y no crea el admin", () => {
    const codigo = `
      const { default: createApp } = await import("./app.js");
      const { createFakeBirdsProvider } = await import("./birds/fakeBirdsProvider.js");
      const { UserModel } = await import("./dao/models/index.js");
      await createApp({ birdsProvider: createFakeBirdsProvider() });
      console.log("ADMINS=" + (await UserModel.count({ where: { role: "admin" } })));
    `;
    const { code, salida } = correr(codigo, {
      JWT_SECRET: "x",
      PERSISTENCE_TYPE: "sequelize",
      DB_STORAGE: ":memory:",
      SEED_PLAYERS: "0",
    });
    assert.equal(code, 0, salida);
    assert.match(salida, /Falta ADMIN_PASSWORD/);
    assert.match(salida, /ADMINS=0/);
  });
});
