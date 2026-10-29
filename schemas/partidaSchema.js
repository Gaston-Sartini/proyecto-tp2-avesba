import { z } from "zod";

const ESTADOS = ["activa", "terminada"];
const ORDENES = ["createdAt", "-createdAt", "puntos_totales", "-puntos_totales"];

// Query de GET /partidas: filtros, orden y paginación
const queryPartidasSchema = z.object({
  user_id: z.coerce.number().int("user_id debe ser un entero").positive("user_id debe ser positivo").optional(),
  estado: z.enum(ESTADOS, { error: "estado debe ser 'activa' o 'terminada'" }).optional(),
  sort: z
    .enum(ORDENES, { error: "sort debe ser createdAt, -createdAt, puntos_totales o -puntos_totales" })
    .default("-createdAt"),
  page: z.coerce.number().int("La página debe ser un entero").positive("La página debe ser mayor a 0").default(1),
  per_page: z.coerce
    .number()
    .int("per_page debe ser un entero")
    .positive("per_page debe ser mayor a 0")
    .max(100, "per_page no puede ser mayor a 100")
    .default(20),
});

// Body de POST /partidas: de dónde y en qué idioma traer las aves (10434 = Buenos Aires, 7190 = Argentina)
// .prefault({}): si no viene body, valida un {} vacío y así se aplican los valores por defecto de adentro
// (.default({}) devolvería {} tal cual, sin place_id ni locale)
const createPartidaSchema = z
  .object({
    place_id: z.number({ error: "place_id debe ser un número" }).int().positive().default(10434),
    locale: z.string().min(2, "locale no es válido").default("es-AR"),
  })
  .prefault({});

// Body de PATCH /partidas/:id: lo único que se puede cambiar es terminar la partida
const updatePartidaSchema = z.object({
  estado: z.literal("terminada", { error: "Solo se puede cambiar el estado a 'terminada'" }),
});

// Parámetro de la URL (ej: /partidas/:id)
const partidaIdParamSchema = z.object({
  id: z.coerce.number().int("El ID debe ser un número entero").positive("El ID debe ser un número positivo"),
});

export { queryPartidasSchema, createPartidaSchema, updatePartidaSchema, partidaIdParamSchema };
