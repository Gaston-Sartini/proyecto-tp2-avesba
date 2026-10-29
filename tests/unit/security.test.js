import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import createPasswordHasher from "../../security/passwordHasher.js";
import createTokenService from "../../security/tokenService.js";
import createLoginAttempts from "../../security/loginAttempts.js";

const esAppError = (code, statusCode) => (err) => err.code === code && err.statusCode === statusCode;

describe("Hasheador de contraseñas", () => {
  const hasher = createPasswordHasher({ rounds: 4 });

  it("el hash empieza con $2 y no contiene la contraseña", async () => {
    const hash = await hasher.hash("MiClave123");
    assert.match(hash, /^\$2/);
    assert.ok(!hash.includes("MiClave123"));
  });

  it("la misma contraseña da hashes distintos (salt) y compare funciona con los dos", async () => {
    const hash1 = await hasher.hash("MiClave123");
    const hash2 = await hasher.hash("MiClave123");
    assert.notEqual(hash1, hash2);
    assert.equal(await hasher.compare("MiClave123", hash1), true);
    assert.equal(await hasher.compare("MiClave123", hash2), true);
  });

  it("compare da false con otra contraseña", async () => {
    const hash = await hasher.hash("MiClave123");
    assert.equal(await hasher.compare("OtraClave", hash), false);
  });
});

describe("Servicio de tokens", () => {
  const tokens = createTokenService({ secret: "secreto", accessExpiresInSeconds: 60, refreshExpiresInSeconds: 120 });

  it("firma y verifica un access token con su tipo", () => {
    const payload = tokens.verify(tokens.signAccess({ sub: "7", role: "jugador" }));
    assert.equal(payload.sub, "7");
    assert.equal(payload.role, "jugador");
    assert.equal(payload.type, "access");
  });

  it("el refresh token tiene tipo refresh", () => {
    assert.equal(tokens.verify(tokens.signRefresh({ sub: "7" })).type, "refresh");
  });

  it("un token vencido lanza TOKEN_EXPIRED (401)", () => {
    const vencido = jwt.sign({ sub: "7", type: "access", exp: Math.floor(Date.now() / 1000) - 10 }, "secreto");
    assert.throws(() => tokens.verify(vencido), esAppError("TOKEN_EXPIRED", 401));
  });

  it("un token modificado lanza TOKEN_INVALID (401)", () => {
    const [header, payload, firma] = tokens.signAccess({ sub: "7", role: "jugador" }).split(".");
    const payloadAdulterado = Buffer.from(JSON.stringify({ sub: "7", role: "admin", type: "access" })).toString("base64url");
    assert.throws(() => tokens.verify(`${header}.${payloadAdulterado}.${firma}`), esAppError("TOKEN_INVALID", 401));
    assert.ok(payload); // el original existía
  });

  it("un token firmado con otro secreto lanza TOKEN_INVALID", () => {
    const ajeno = jwt.sign({ sub: "7", type: "access" }, "otro-secreto");
    assert.throws(() => tokens.verify(ajeno), esAppError("TOKEN_INVALID", 401));
  });

  it("rechaza un token sin firma (alg: none)", () => {
    const sinFirma = jwt.sign({ sub: "7", type: "access" }, null, { algorithm: "none" });
    assert.throws(() => tokens.verify(sinFirma), esAppError("TOKEN_INVALID", 401));
  });
});

describe("Intentos de login", () => {
  it("bloquea después de N fallos y se desbloquea al limpiar", () => {
    const attempts = createLoginAttempts({ maxAttempts: 3, windowMs: 60_000 });
    for (let i = 0; i < 3; i++) {
      attempts.check("a@test.com");
      attempts.registerFailure("a@test.com");
    }
    assert.throws(() => attempts.check("a@test.com"), esAppError("TOO_MANY_ATTEMPTS", 429));
    assert.doesNotThrow(() => attempts.check("otro@test.com"));

    attempts.clear("a@test.com");
    assert.doesNotThrow(() => attempts.check("a@test.com"));
  });

  it("los fallos viejos (fuera de la ventana) no cuentan", () => {
    const attempts = createLoginAttempts({ maxAttempts: 1, windowMs: 0 });
    attempts.registerFailure("a@test.com");
    assert.doesNotThrow(() => attempts.check("a@test.com"));
  });
});
