import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

import { decrypt, encrypt, hashToken, maskPhone, generateResetToken } from '../src/utils/crypto';

test('AES-256-GCM cifra y descifra con IV de 12 bytes y tag de 16 bytes', () => {
  const plain = 'ES9121000418450200051332';
  const encrypted = encrypt(plain);
  const [iv, tag] = encrypted.split(':').map((part) => Buffer.from(part, 'base64'));

  assert.equal(iv.length, 12);
  assert.equal(tag.length, 16);
  assert.equal(decrypt(encrypted), plain);
});

test('dos cifrados del mismo texto producen salidas distintas (IV aleatorio)', () => {
  assert.notEqual(encrypt('1500.00'), encrypt('1500.00'));
});

test('una alteración del texto cifrado falla la autenticación', () => {
  const [iv, tag, data] = encrypt('saldo-secreto').split(':');
  const tampered = Buffer.from(data, 'base64');
  tampered[0] ^= 0xff;
  assert.throws(() => decrypt([iv, tag, tampered.toString('base64')].join(':')));
});

test('el token de recuperación tiene 32 bytes y su hash SHA-256 es determinista', () => {
  const token = generateResetToken();
  assert.equal(Buffer.from(token, 'hex').length, 32);
  assert.equal(hashToken(token), hashToken(token));
  assert.equal(hashToken(token).length, 64);
});

test('el teléfono se muestra solo enmascarado', () => {
  assert.equal(maskPhone('+506 8888-1234'), '***-***-1234');
});
