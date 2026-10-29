import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildQuestions, buildQuestion } from "../../usecases/game/buildQuestions.js";
import AppError from "../../errors/AppError.js";

const aves = Array.from({ length: 15 }, (_, i) => ({
  id: 1000 + i,
  nombre: `Ave ${i}`,
  nombreCientifico: `Avis testus ${i}`,
  foto: `https://example.com/${i}.jpg`,
  atribucion: "Test",
}));

describe("Armado de preguntas", () => {
  it("una pregunta tiene la foto del ave y 4 opciones distintas, una de ellas la correcta", () => {
    const pregunta = buildQuestion(aves[0], aves);

    assert.equal(pregunta.id, aves[0].id);
    assert.equal(pregunta.foto, aves[0].foto);
    assert.equal(pregunta.opciones.length, 4);
    assert.equal(new Set(pregunta.opciones.map((o) => o.id)).size, 4);
    assert.ok(pregunta.opciones.some((o) => o.id === aves[0].id && o.nombre === aves[0].nombre));
  });

  it("las opciones no muestran la foto (solo id, nombre y nombre científico)", () => {
    const pregunta = buildQuestion(aves[0], aves);
    for (const opcion of pregunta.opciones) {
      assert.deepEqual(Object.keys(opcion).sort(), ["id", "nombre", "nombreCientifico"]);
    }
  });

  it("un lote tiene 10 preguntas de aves distintas", () => {
    const lote = buildQuestions(aves, 10);
    assert.equal(lote.length, 10);
    assert.equal(new Set(lote.map((p) => p.id)).size, 10);
  });

  it("si no hay suficientes aves lanza un AppError 503", () => {
    assert.throws(
      () => buildQuestions(aves.slice(0, 5), 10),
      (err) => err instanceof AppError && err.statusCode === 503 && err.code === "NOT_ENOUGH_BIRDS"
    );
  });

  it("no modifica el listado original de aves", () => {
    const copia = structuredClone(aves);
    buildQuestions(aves, 10);
    assert.deepEqual(aves, copia);
  });
});
