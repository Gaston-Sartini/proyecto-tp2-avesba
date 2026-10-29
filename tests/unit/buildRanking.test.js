import { describe, it } from "node:test";
import assert from "node:assert/strict";
import buildRanking from "../../usecases/game/buildRanking.js";

const users = [
  { id: 1, nombre: "Ana", apellido: "A" },
  { id: 2, nombre: "Beto", apellido: "B" },
  { id: 3, nombre: "Caro", apellido: "C" },
];

const respuesta = (user_id, es_correcta, bonus_racha = 0) => ({
  user_id,
  es_correcta,
  puntos_obtenidos: es_correcta ? 10 : 0,
  bonus_racha,
});

describe("Ranking", () => {
  it("ordena por puntos (incluido el bonus) de mayor a menor", () => {
    const ranking = buildRanking(users, [
      respuesta(1, true),
      respuesta(2, true),
      respuesta(2, true, 5),
      respuesta(3, false),
    ]);

    assert.deepEqual(
      ranking.map((j) => [j.user_id, j.puntos_totales]),
      [
        [2, 25],
        [1, 10],
        [3, 0],
      ]
    );
  });

  it("cuenta aciertos y fallos de cada jugador", () => {
    const [primero] = buildRanking(users, [respuesta(1, true), respuesta(1, false), respuesta(1, false)]);
    assert.deepEqual(primero, { user_id: 1, nombre: "Ana", apellido: "A", puntos_totales: 10, aciertos: 1, fallos: 2 });
  });

  it("incluye a los que todavía no jugaron, con 0 puntos", () => {
    const ranking = buildRanking(users, []);
    assert.equal(ranking.length, 3);
    assert.ok(ranking.every((j) => j.puntos_totales === 0 && j.aciertos === 0 && j.fallos === 0));
  });

  it("si empatan en puntos, desempata por aciertos y después por antigüedad", () => {
    const ranking = buildRanking(users, [respuesta(3, true), respuesta(2, true)]);
    assert.deepEqual(
      ranking.map((j) => j.user_id),
      [2, 3, 1]
    );
  });
});
