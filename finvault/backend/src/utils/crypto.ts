import crypto from 'crypto';

/**
 * Criptografía de FinVault.
 *
 * - HASH LENTO  (contraseñas)      -> bcrypt, ver models/User.ts. Irreversible.
 * - HASH RÁPIDO (tokens de reseteo) -> SHA-256 de un token aleatorio. Irreversible.
 * - CIFRADO     (datos en reposo)  -> AES-256-GCM. Reversible con DATA_ENCRYPTION_KEY.
 *
 * Formato del dato cifrado: base64(iv) ':' base64(authTag) ':' base64(ciphertext)
 *   - IV de 12 bytes aleatorio por cada cifrado.
 *   - Auth Tag de 16 bytes (autenticación: cualquier manipulación provoca error).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const RESET_TOKEN_BYTES = 32;

/**
 * La clave se lee SIEMPRE de process.env en cada operación (nunca se copia a
 * otro módulo ni se registra en logs).
 */
const getEncryptionKey = (): Buffer => {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('DATA_ENCRYPTION_KEY no está configurada');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error('DATA_ENCRYPTION_KEY debe ser de 32 bytes codificados en Base64');
  }
  return key;
};

/** Valida la clave al arrancar el servidor (fallo rápido). */
export const assertEncryptionKey = (): void => {
  getEncryptionKey();
};

export const encrypt = (plaintext: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => part.toString('base64')).join(':');
};

export const decrypt = (payload: string): string => {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de dato cifrado inválido');
  }

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Longitud de IV o Auth Tag inválida');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

/** Token de recuperación en claro: se envía SOLO al usuario por correo. */
export const generateResetToken = (): string =>
  crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');

/** Hash SHA-256 del token: lo único que se guarda en la base de datos. */
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token, 'utf8').digest('hex');

/** Muestra solo los últimos 4 dígitos: ***-***-1234 */
export const maskPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return `***-***-${digits.slice(-4)}`;
};
