import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { UniqueConstraintError } from 'sequelize';
import { SESSION_COOKIE } from '../middlewares/authMiddleware';
import { PasswordReset, User } from '../models';
import { BCRYPT_COST } from '../models/User';
import { sequelize } from '../config/database';
import { env, isProduction } from '../config/env';
import { sendPasswordResetEmail, isMailerConfigured } from '../services/mailer';
import { generateResetToken, hashToken } from '../utils/crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';
import { SESSION_TTL_SECONDS, signSessionToken } from '../utils/jwt';
import { Op } from 'sequelize';
import type {
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/schemas';
import type { z } from 'zod';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const GENERIC_REGISTER_ERROR = 'No se pudo completar el registro';
const GENERIC_AUTH_ERROR = 'Credenciales inválidas';
const GENERIC_RESET_RESPONSE =
  'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña';

/**
 * Hash señuelo: permite ejecutar bcrypt aunque el correo no exista, para que
 * el tiempo de respuesta no revele qué cuentas existen (anti enumeración).
 */
const DUMMY_HASH = bcrypt.hashSync('finvault-dummy-password', BCRYPT_COST);

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const setSessionCookie = (res: Response, userId: string, role: User['role']): void => {
  res.cookie(SESSION_COOKIE, signSessionToken(userId, role), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });
};

/** A08: verifica firma, emisor, audiencia y expiración del ID token de Google. */
const verifyGoogleCredential = async (credential: string): Promise<TokenPayload | null> => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload() ?? null;
  } catch {
    return null;
  }
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as RegisterInput;

  try {
    // El rol y el proveedor NO vienen del cliente: siempre 'user' y 'local'.
    const user = await User.create({ email, password, provider: 'local', role: 'user' });
    logger.info({ event: 'register', userId: user.id }, 'register');
    res.status(201).json({ success: true, message: 'Registro exitoso', user: user.toSafeJSON() });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      // Respuesta genérica para no confirmar si el correo ya existe.
      res.status(400).json({ success: false, message: GENERIC_REGISTER_ERROR });
      return;
    }
    throw error;
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await User.findOne({ where: { email } });
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!user || !user.passwordHash || !passwordMatches) {
    logger.warn({ event: 'login_failed', ip: req.ip }, 'login_failed');
    res.status(401).json({ success: false, message: GENERIC_AUTH_ERROR });
    return;
  }

  setSessionCookie(res, user.id, user.role);
  logger.info({ event: 'login_success', userId: user.id }, 'login_success');
  res.json({ success: true, user: user.toSafeJSON() });
});

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/' });
  logger.info({ event: 'logout' }, 'logout');
  res.json({ success: true, message: 'Sesión cerrada' });
};

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ success: false, message: 'Inicio de sesión con Google no disponible' });
    return;
  }

  const { credential } = req.body as GoogleLoginInput;

  const payload = await verifyGoogleCredential(credential);
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    res.status(401).json({ success: false, message: 'Token de Google inválido' });
    return;
  }

  const email = payload.email.trim().toLowerCase();
  let user = await User.findOne({ where: { googleId: payload.sub } });

  if (!user) {
    // Solo se enlaza por correo cuando Google confirma que el correo es verificado.
    user = await User.findOne({ where: { email } });
    if (user) {
      user.googleId = payload.sub;
      await user.save();
    } else {
      user = await User.create({ email, provider: 'google', googleId: payload.sub, role: 'user' });
    }
  }

  setSessionCookie(res, user.id, user.role);
  logger.info({ event: 'google_login', userId: user.id }, 'google_login');
  res.json({ success: true, user: user.toSafeJSON() });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as ForgotPasswordInput;
  const user = await User.findOne({ where: { email } });

  if (user) {
    const token = generateResetToken();
    await PasswordReset.destroy({ where: { userId: user.id, usedAt: null } });
    await PasswordReset.create({
      userId: user.id,
      tokenHash: hashToken(token), // solo el hash SHA-256 llega a la base de datos
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    try {
      if (!isMailerConfigured()) {
        throw new Error('mailer_not_configured');
      }
      await sendPasswordResetEmail(user.email, token);
    } catch (error) {
      // Nunca se registra el token ni el correo: solo el tipo de fallo.
      logger.error(
        { event: 'password_reset_requested', userId: user.id, mailError: (error as Error).message },
        'password_reset_mail_failed',
      );
    }

    logger.info({ event: 'password_reset_requested', userId: user.id }, 'password_reset_requested');
  }

  res.json({ success: true, message: GENERIC_RESET_RESPONSE });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as ResetPasswordInput;
  const tokenHash = hashToken(token);

  const outcome = await sequelize.transaction(async (transaction) => {
    const record = await PasswordReset.findOne({
      where: { tokenHash, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!record) return { ok: false as const };

    const user = await User.findByPk(record.userId, { transaction });
    if (!user) return { ok: false as const };

    user.password = newPassword; // el hook beforeSave aplica bcrypt
    await user.save({ transaction });

    // Invalida todos los tokens de recuperación pendientes del usuario.
    await PasswordReset.update(
      { usedAt: new Date() },
      { where: { userId: user.id, usedAt: null }, transaction },
    );

    return { ok: true as const, userId: user.id };
  });

  if (!outcome.ok) {
    res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    return;
  }

  logger.info({ event: 'password_reset_completed', userId: outcome.userId }, 'password_reset_completed');
  res.json({ success: true, message: 'Contraseña actualizada correctamente' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return;
  }
  res.json({ success: true, user: user.toSafeJSON() });
});
