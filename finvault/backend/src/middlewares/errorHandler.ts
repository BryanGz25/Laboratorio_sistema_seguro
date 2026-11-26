import { NextFunction, Request, Response } from 'express';
import { isProduction } from '../config/env';
import { logger } from '../utils/logger';

/** 404 para rutas inexistentes. */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: 'Recurso no encontrado' });
};

/**
 * A10 Mishandling of Exceptional Conditions: captura global. El cliente nunca
 * recibe stack traces ni mensajes internos; solo el log del servidor los conserva.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const status = getStatus(err);

  if (status < 500) {
    // Errores de cliente (JSON malformado, payload grande): mensaje controlado.
    res.status(status).json({ success: false, message: clientMessage(status) });
    return;
  }

  const error = err instanceof Error ? err : new Error('Unknown error');
  logger.error(
    {
      event: 'unhandled_error',
      method: req.method,
      path: req.path,
      errorName: error.name,
      errorMessage: error.message,
      ...(isProduction ? {} : { stack: error.stack }),
    },
    'unhandled_error',
  );

  res.status(500).json({ success: false, message: 'Error interno en el servidor' });
};

const getStatus = (err: unknown): number => {
  if (typeof err === 'object' && err !== null) {
    const candidate = (err as { status?: unknown; statusCode?: unknown }).status
      ?? (err as { statusCode?: unknown }).statusCode;
    if (typeof candidate === 'number' && candidate >= 400 && candidate < 600) {
      return candidate;
    }
  }
  return 500;
};

const clientMessage = (status: number): string => {
  switch (status) {
    case 400:
      return 'Solicitud inválida';
    case 413:
      return 'El contenido enviado es demasiado grande';
    default:
      return 'Solicitud inválida';
  }
};
