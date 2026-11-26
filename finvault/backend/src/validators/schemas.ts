import { z } from 'zod';

/** Política de complejidad de contraseñas (A07). */
export const passwordSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128, 'La contraseña es demasiado larga')
  .regex(/[a-z]/, 'Debe incluir una minúscula')
  .regex(/[A-Z]/, 'Debe incluir una mayúscula')
  .regex(/\d/, 'Debe incluir un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir un símbolo');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Correo inválido')
  .max(254);

/** IBAN: 2 letras de país, 2 dígitos de control, hasta 30 alfanuméricos. */
const ibanSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, '').toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, 'IBAN inválido'));

/** Saldo decimal como texto (evita errores de coma flotante). */
const balanceSchema = z
  .string()
  .trim()
  .regex(/^-?\d{1,12}(\.\d{1,2})?$/, 'Saldo inválido (máximo 2 decimales)');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Token inválido'),
  newPassword: passwordSchema,
});

export const googleLoginSchema = z.object({
  credential: z.string().min(20).max(4096),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Identificador inválido'),
});

export const createAccountSchema = z.object({
  alias: z.string().trim().min(1).max(60),
  iban: ibanSchema,
  balance: balanceSchema,
  notes: z.string().max(500).optional(),
});

export const updateAccountSchema = z
  .object({
    alias: z.string().trim().min(1).max(60).optional(),
    balance: balanceSchema.optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Debes enviar al menos un campo');

export const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});
