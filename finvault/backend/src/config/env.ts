import 'dotenv/config';
import { z } from 'zod';

/**
 * Variables de entorno validadas al arrancar. Un valor faltante o inválido
 * detiene el proceso (fail-fast). Nunca se imprimen los valores.
 *
 * Nota: DATA_ENCRYPTION_KEY se lee directamente en utils/crypto.ts.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  DATA_ENCRYPTION_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  MAX_ACCOUNTS_PER_USER: z.coerce.number().int().positive().default(10),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('FinVault <no-reply@finvault.local>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  // Solo nombres de campo y mensajes; nunca valores.
  throw new Error(`Configuración de entorno inválida -> ${fields.join('; ')}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
