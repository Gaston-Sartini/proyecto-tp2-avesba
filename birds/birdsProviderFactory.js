import { BIRDS_PROVIDER } from "../config/config.js";
import inaturalistBirdsProvider from "./inaturalistBirdsProvider.js";
import fakeBirdsProvider from "./fakeBirdsProvider.js";

/**
 * Factory de proveedores de aves (equivalente a daoFactory y notifierFactory).
 * Devuelve la implementación según BIRDS_PROVIDER ("inaturalist" o "fake").
 */
function getBirdsProvider() {
  if (BIRDS_PROVIDER === "fake") {
    console.log("[Aves] Usando aves de prueba (sin internet)");
    return fakeBirdsProvider;
  }
  console.log("[Aves] Usando iNaturalist");
  return inaturalistBirdsProvider;
}

export { getBirdsProvider };
