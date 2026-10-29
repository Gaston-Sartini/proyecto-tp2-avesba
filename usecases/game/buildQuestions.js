import AppError from "../../errors/AppError.js";

// Mezcla una copia del array (algoritmo de Fisher-Yates) sin tocar el original
function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Elige `cantidad` elementos distintos al azar
const elegir = (lista, cantidad) => mezclar(lista).slice(0, cantidad);

// Lo que ve el jugador en cada botón: sin la foto
const comoOpcion = ({ id, nombre, nombreCientifico }) => ({ id, nombre, nombreCientifico });

/**
 * Arma UNA pregunta: el ave correcta (con su foto) y 4 opciones mezcladas (1 correcta + 3 falsas).
 */
function buildQuestion(aveCorrecta, todasLasAves) {
  const falsas = elegir(
    todasLasAves.filter((ave) => ave.id !== aveCorrecta.id),
    3
  );

  return {
    id: aveCorrecta.id,
    nombre: aveCorrecta.nombre,
    nombreCientifico: aveCorrecta.nombreCientifico,
    foto: aveCorrecta.foto,
    atribucion: aveCorrecta.atribucion ?? null,
    opciones: mezclar([aveCorrecta, ...falsas].map(comoOpcion)),
  };
}

/**
 * Arma un lote de `cantidad` preguntas distintas a partir de un único listado de aves
 * (las mismas aves se usan como opciones falsas). Una sola consulta a iNaturalist alcanza para todo el lote.
 */
function buildQuestions(aves, cantidad) {
  if (aves.length < cantidad) {
    throw new AppError("NOT_ENOUGH_BIRDS", `Se necesitan al menos ${cantidad} aves y hay ${aves.length}`, 503);
  }
  return elegir(aves, cantidad).map((ave) => buildQuestion(ave, aves));
}

export { buildQuestion, buildQuestions, mezclar, elegir };
