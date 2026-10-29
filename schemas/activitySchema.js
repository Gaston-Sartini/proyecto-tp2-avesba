import { z } from "zod";

// Body de POST /api/user-connection-log (lo manda el front al cerrar la pestaña)
const connectionLogSchema = z.object({
  userId: z.number().int().positive().nullable(), // null si cerró sin estar logueado
  tiempoConectado: z
    .number({ error: "tiempoConectado debe ser un número" })
    .int("tiempoConectado debe ser un entero (milisegundos)")
    .nonnegative("tiempoConectado no puede ser negativo"),
});

export { connectionLogSchema };
