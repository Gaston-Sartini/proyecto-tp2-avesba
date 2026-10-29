import { z } from "zod";

// Query de POST /juego/iniciar y GET /juego/aves: de qué lugar y en qué idioma traer las aves.
// 10434 = Buenos Aires, 7190 = Argentina
const birdsQuerySchema = z.object({
  place_id: z.coerce.number().int("place_id debe ser un entero").positive("place_id debe ser positivo").default(10434),
  locale: z.string().min(2, "locale no es válido").default("es-AR"),
});

// Body de POST /juego/respuesta
const answerSchema = z.object({
  ave_id: z.number({ error: "ave_id debe ser un número" }).int("ave_id debe ser un entero"),
  respuesta_usuario: z
    .string({ error: "respuesta_usuario es obligatoria" })
    .min(1, "respuesta_usuario no puede estar vacía"),
  // Ya no se usa para validar: el nombre correcto sale del lote guardado en la partida.
  // Se acepta para no romper a los clientes que todavía lo mandan.
  ave_nombre: z.string().nullable().optional(),
});

// Query de GET /juego/ranking
const rankingQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int("limit debe ser un entero")
    .min(1, "limit debe ser al menos 1")
    .max(100, "limit no puede ser mayor a 100")
    .default(10),
});

export { birdsQuerySchema, answerSchema, rankingQuerySchema };
