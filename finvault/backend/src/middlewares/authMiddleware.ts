import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../models/User';
import { verifySessionToken } from '../utils/jwt';
import { logger } from '../utils/logger';

export const SESSION_COOKIE = 'finvault_session';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/** Protección JWT: valida la cookie HttpOnly y carga req.user. */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string') {
    res.status(401).json({ success: false, message: 'No autenticado' });
    return;
  }

  try {
    const payload = verifySessionToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Sesión inválida o expirada' });
  }
};

/** RBAC: restringe una ruta a los roles indicados. */
export const requireRole =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn(
        {
          event: 'access_denied',
          userId: req.user?.id,
          requiredRoles: allowedRoles,
          method: req.method,
          path: req.path,
        },
        'access_denied',
      );
      res.status(403).json({ success: false, message: 'Acceso denegado' });
      return;
    }
    next();
  };
