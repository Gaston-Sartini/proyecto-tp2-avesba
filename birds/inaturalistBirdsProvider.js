import { nombreArgentino } from "./argentineNames.js";

const INATURALIST_API_BASE_URL = "https://api.inaturalist.org/v1";
const TIMEOUT_MS = 10_000;

/**
 * Proveedor de aves que consume la API externa de iNaturalist con fetch.
 * Contrato (el mismo que fakeBirdsProvider): getBirds({ place_id, locale }) → [{ id, nombre, nombreCientifico, foto, atribucion }]
 * Si iNaturalist no responde o responde mal, LANZA un error: el caso de uso decide qué hacer.
 */
const inaturalistBirdsProvider = {
  async getBirds({ place_id, locale }) {
    // taxon_id=3 son las aves. native=true: solo especies nativas del lugar.
    const params = new URLSearchParams({
      taxon_id: "3",
      place_id: String(place_id),
      native: "true",
      quality_grade: "research",
      locale,
      per_page: "100",
    });

    // AbortSignal.timeout corta el pedido si tarda más de 10 segundos
    const response = await fetch(`${INATURALIST_API_BASE_URL}/observations/species_counts?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`iNaturalist respondió ${response.status}`);
    }

    const data = await response.json();

    // Nos quedamos solo con las aves que tienen foto y nombre común, y las pasamos a nuestro formato
    const aves = (data.results ?? [])
      .map((resultado) => resultado.taxon ?? {})
      .filter((taxon) => taxon.default_photo && taxon.preferred_common_name)
      .map((taxon) => ({
        id: taxon.id,
        nombre: nombreArgentino(taxon.id, taxon.preferred_common_name),
        nombreCientifico: taxon.name ?? "Unknown",
        foto: taxon.default_photo.medium_url ?? "",
        atribucion: taxon.default_photo.attribution ?? null,
      }));

    if (aves.length === 0) {
      throw new Error("No se obtuvieron aves de iNaturalist");
    }

    return aves;
  },
};

export default inaturalistBirdsProvider;
