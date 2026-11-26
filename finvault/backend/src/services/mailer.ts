import nodemailer from 'nodemailer';
import { env } from '../config/env';

/**
 * Envío de correos transaccionales. Si SMTP_URL no está definido, el envío
 * falla de forma controlada y NUNCA se registra el token en los logs.
 */
const transporter = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;

export const isMailerConfigured = (): boolean => transporter !== null;

export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  if (!transporter) {
    throw new Error('SMTP no configurado');
  }

  const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: 'Restablece tu contraseña de FinVault',
    text: `Recibimos una solicitud para restablecer tu contraseña.\n\n${link}\n\nEl enlace expira en 15 minutos. Si no fuiste tú, ignora este correo.`,
    html: `<p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${link}">Restablecer contraseña</a></p><p>El enlace expira en 15 minutos. Si no fuiste tú, ignora este correo.</p>`,
  });
};
