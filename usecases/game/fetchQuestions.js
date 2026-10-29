import AppError from "../../errors/AppError.js";
import { buildQuestions } from "./buildQuestions.js";
import { PREGUNTAS_POR_PARTIDA } from "./gameRules.js";

/**
 * Pide las aves al proveedor (iNaturalist o el falso) y arma el lote de 10 preguntas.
 * Si la API externa falla, lo traducimos a un error nuestro (503 = el servicio no está disponible):
 * al jugador no le importa si se cayó iNaturalist, le importa que no puede jugar ahora.
 */
async function fetchQuestions({ place_id, locale }, birdsProvider) {
  let aves;
  try {
    aves = await birdsProvider.getBirds({ place_id, locale });
  } catch (err) {
    console.error("[juego] Error obteniendo aves:", err.message);
    throw new AppError("BIRDS_UNAVAILABLE", "No se pudieron obtener las aves de iNaturalist", 503);
  }
  return buildQuestions(aves, PREGUNTAS_POR_PARTIDA);
}

export default fetchQuestions;
