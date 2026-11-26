import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/User';

/** A08: algoritmo FIJO. Nunca se acepta 'none' ni otro algoritmo distinto. */
const ALGORITHM = 'HS256' as const;
const ISSUER = 'finvault';
export const SESSION_TTL_SECONDS = 15 * 60; // 15 minutos

export const signSessionToken = (userId: string, role: UserRole): string =>
  jwt.sign({ role }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    issuer: ISSUER,
    expiresIn: SESSION_TTL_SECONDS,
  });

export interface SessionPayload {
  sub: string;
  role: UserRole;
}

export const verifySessionToken = (token: string): SessionPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
  }) as JwtPayload;

  if (typeof decoded.sub !== 'string' || (decoded.role !== 'user' && decoded.role !== 'admin')) {
    throw new Error('Payload de sesión inválido');
  }
  return { sub: decoded.sub, role: decoded.role };
};
