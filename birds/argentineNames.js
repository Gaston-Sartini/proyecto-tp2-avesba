/**
 * Nombres comunes usados en Argentina, indexados por taxon_id de iNaturalist.
 * Se indexa por id y no por nombre: el nombre de iNaturalist puede cambiar, el id no.
 * Los taxones que no estén acá conservan el nombre que devuelve iNaturalist.
 */
const NOMBRES_ARGENTINOS = {
  4867: "Tero",
  1289601: "Biguá",
  19975: "Lechucita de las vizcacheras",
  19349: "Cotorra",
  9183: "Chingolo",
  10371: "Tordo renegrido",
  16956: "Benteveo común",
  4665: "Halconcito colorado",
  3439: "Torcaza",
  4258: "Flamenco austral",
  4940: "Garcita blanca",
};

// Devuelve el nombre argentino del taxón, o el de iNaturalist si no hay uno cargado
function nombreArgentino(taxonId, nombreINaturalist) {
  return NOMBRES_ARGENTINOS[taxonId] ?? nombreINaturalist;
}

export { NOMBRES_ARGENTINOS, nombreArgentino };
