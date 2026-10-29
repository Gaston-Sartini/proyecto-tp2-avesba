import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NOMBRES_ARGENTINOS, nombreArgentino } from "../../birds/argentineNames.js";

describe("Nombres argentinos de aves", () => {
  it("un taxón con nombre argentino usa el nombre local", () => {
    assert.equal(nombreArgentino(1289601, "Corúa Neotropical"), "Biguá");
  });

  it("un taxón sin nombre argentino conserva el de iNaturalist", () => {
    assert.equal(nombreArgentino(999999999, "Nombre de iNaturalist"), "Nombre de iNaturalist");
  });

  it("los ids son enteros y los nombres no están vacíos ni tienen espacios de más", () => {
    for (const [taxonId, nombre] of Object.entries(NOMBRES_ARGENTINOS)) {
      assert.ok(Number.isInteger(Number(taxonId)), `id ${taxonId}`);
      assert.ok(nombre && nombre.trim() === nombre, `nombre "${nombre}"`);
    }
  });

  it("no se repiten nombres entre taxones (haría ambigua la validación de respuestas)", () => {
    const nombres = Object.values(NOMBRES_ARGENTINOS);
    assert.equal(new Set(nombres).size, nombres.length);
  });
});
