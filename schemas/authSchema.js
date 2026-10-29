import { z } from "zod";

// bcrypt solo procesa los primeros 72 bytes de la contraseña: por eso el máximo es 72
const password = z
  .string({ error: "La contraseña es obligatoria" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede tener más de 72 caracteres");

const nombre = (label) =>
  z
    .string({ error: `El ${label} es obligatorio` })
    .trim()
    .min(1, `El ${label} no puede estar vacío`)
    .max(100, `El ${label} no puede tener más de 100 caracteres`);

const email = z.email({ error: "Debe ser un correo electrónico válido" });

// Esquema para POST /auth/register.
// NO acepta `role`: si un endpoint público dejara elegir el rol, cualquiera se registraría
// como admin (escalada de privilegios). Todo usuario nuevo es "jugador".
const registerSchema = z.object({
  nombre: nombre("nombre"),
  apellido: nombre("apellido"),
  email,
  password,
});

// Esquema para POST /auth/login
const loginSchema = z.object({
  email,
  password: z.string({ error: "La contraseña es obligatoria" }).min(1, "La contraseña es obligatoria"),
});

// Esquema para POST /auth/refresh: el refresh_token puede venir en el body o en la cookie
const refreshSchema = z
  .object({
    refresh_token: z.string().min(1, "El refresh_token no puede estar vacío").optional(),
  })
  .default({});

export { password, registerSchema, loginSchema, refreshSchema };
