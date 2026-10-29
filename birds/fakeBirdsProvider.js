/**
 * Proveedor de aves FALSO: devuelve siempre las mismas 15 aves, sin internet.
 * Respeta el mismo contrato que inaturalistBirdsProvider, así que el juego no nota la diferencia.
 * Sirve para los tests y para trabajar sin conexión (BIRDS_PROVIDER=fake en el .env).
 */
function createFakeBirdsProvider(cantidad = 15) {
  const aves = Array.from({ length: cantidad }, (_, i) => ({
    id: 1000 + i,
    nombre: `Ave ${i}`,
    nombreCientifico: `Avis testus ${i}`,
    foto: `https://example.com/${i}.jpg`,
    atribucion: "Test",
  }));

  return {
    async getBirds() {
      return aves.map((ave) => ({ ...ave }));
    },
  };
}

export { createFakeBirdsProvider };
export default createFakeBirdsProvider();
