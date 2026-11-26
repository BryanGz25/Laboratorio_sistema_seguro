import { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { logger } from '../utils/logger';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const onLimitReached = (req: Request): void => {
  logger.warn(
    { event: 'rate_limit_exceeded', method: req.method, path: req.path },
    'rate_limit_exceeded',
  );
};

const normalizedEmail = (req: Request): string =>
  typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

/**
 * A07 Anti fuerza bruta: máximo 5 intentos por 15 min por combinación IP + correo.
 * Los inicios de sesión exitosos no consumen cupo.
 */
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${normalizedEmail(req)}`,
  handler: (req, res) => {
    onLimitReached(req);
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos. Intenta de nuevo más tarde.',
    });
  },
});

/** A06: recuperación de contraseña limitada para evitar spam de correos. */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    onLimitReached(req);
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
    });
  },
});

/** Límite general de la API por IP. */
export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    onLimitReached(req);
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
    });
  },
});
