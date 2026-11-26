import pino from 'pino';
import { env } from '../config/env';

/**
 * Logger estructurado (JSON). Los campos sensibles se censuran automáticamente
 * como defensa en profundidad: el código tampoco debe pasarlos.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'finvault-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'newPassword',
      'token',
      'credential',
      'passwordHash',
      'iban',
      'balance',
      'notes',
      'phone',
      '*.password',
      '*.newPassword',
      '*.token',
      '*.credential',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
});

export type SecurityEvent =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'register'
  | 'google_login'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'role_changed'
  | 'access_denied'
  | 'rate_limit_exceeded';
