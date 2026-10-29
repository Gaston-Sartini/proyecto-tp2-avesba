import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluarRespuesta,
  calcularBonusRacha,
  porcentaje,
  resumirRespuestas,
  armarMensaje,
} from "../../usecases/game/gameRules.js";

describe("Reglas del juego", () => {
  describe("evaluarRespuesta", () => {
    it("una respuesta igual al nombre correcto vale 10 puntos", () => {
      assert.deepEqual(evaluarRespuesta("Tero", "Tero"), { esCorrecta: true, puntos: 10 });
    });

    it("no importan las mayúsculas ni los espacios de más", () => {
      assert.equal(evaluarRespuesta("  tERo ", "Tero").esCorrecta, true);
    });

    it("una respuesta distinta vale 0 puntos", () => {
      assert.deepEqual(evaluarRespuesta("Chingolo", "Tero"), { esCorrecta: false, puntos: 0 });
    });
  });

  describe("calcularBonusRacha", () => {
    it("da bonus a los 3, 5 y 10 o más aciertos seguidos", () => {
      assert.equal(calcularBonusRacha(3), 5);
      assert.equal(calcularBonusRacha(5), 15);
      assert.equal(calcularBonusRacha(10), 50);
      assert.equal(calcularBonusRacha(12), 50);
    });

    it("no da bonus en el resto de las rachas", () => {
      for (const racha of [0, 1, 2, 4, 6, 7, 8, 9]) {
        assert.equal(calcularBonusRacha(racha), 0, `racha ${racha}`);
      }
    });
  });

  describe("porcentaje", () => {
    it("redondea a 2 decimales", () => {
      assert.equal(porcentaje(1, 3), 33.33);
      assert.equal(porcentaje(2, 3), 66.67);
    });

    it("con 0 intentos da 0 (no divide por cero)", () => {
      assert.equal(porcentaje(0, 0), 0);
    });
  });

  describe("resumirRespuestas", () => {
    it("suma puntos base y bonus, y cuenta intentos y aciertos", () => {
      const respuestas = [
        { es_correcta: true, puntos_obtenidos: 10, bonus_racha: 0 },
        { es_correcta: true, puntos_obtenidos: 10, bonus_racha: 0 },
        { es_correcta: true, puntos_obtenidos: 10, bonus_racha: 5 },
        { es_correcta: false, puntos_obtenidos: 0, bonus_racha: 0 },
      ];
      assert.deepEqual(resumirRespuestas(respuestas), {
        puntos_totales: 35,
        total_intentos: 4,
        total_aciertos: 3,
        porcentaje_acierto: 75,
      });
    });

    it("sin respuestas todo da 0", () => {
      assert.deepEqual(resumirRespuestas([]), {
        puntos_totales: 0,
        total_intentos: 0,
        total_aciertos: 0,
        porcentaje_acierto: 0,
      });
    });
  });

  describe("armarMensaje", () => {
    it("avisa si fue correcta o incorrecta", () => {
      assert.equal(armarMensaje(true, 1, 0), "¡Correcto! ✓");
      assert.equal(armarMensaje(false, 0, 0), "Incorrecto. ✗");
    });

    it("agrega el bonus de racha al mensaje", () => {
      assert.match(armarMensaje(true, 3, 5), /Racha de 3! \+5 pts/);
      assert.match(armarMensaje(true, 5, 15), /Racha de 5! \+15 pts/);
      assert.match(armarMensaje(true, 10, 50), /RACHA ÉPICA! \+50 pts/);
    });
  });
});
