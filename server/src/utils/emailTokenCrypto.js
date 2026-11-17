import crypto from 'node:crypto';
import config from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derives a strictly 32-byte binary key from the configured secret.
 * Enforces minimum entropy and length constraints.
 */
export const deriveEncryptionKey = (secret = config.EMAIL_TOKEN_SECRET) => {
  if (!secret || typeof secret !== 'string' || secret.length < 32) {
    throw new Error('EMAIL_TOKEN_SECRET must be configured and contain at least 32 characters for AES-256-GCM encryption.');
  }

  // Use SHA-256 to derive a deterministic 32-byte key buffer from the secret
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
};

/**
 * Encrypts a sensitive plaintext string (such as a temporary password reset token)
 * using authenticated AES-256-GCM encryption.
 * Returns an object containing hex-encoded ciphertext, IV, and authentication tag.
 */
export const encryptToken = (plainText, secret = config.EMAIL_TOKEN_SECRET) => {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('encryptToken: plainText must be a non-empty string.');
  }

  const key = deriveEncryptionKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let ciphertext = cipher.update(plainText, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag
  };
};

/**
 * Decrypts an encrypted token payload using AES-256-GCM.
 * Verifies the authentication tag; throws if ciphertext or auth tag was altered.
 */
export const decryptToken = (encryptedPayload, secret = config.EMAIL_TOKEN_SECRET) => {
  if (!encryptedPayload || typeof encryptedPayload !== 'object') {
    throw new Error('decryptToken: Invalid encrypted payload structure.');
  }

  const { ciphertext, iv, authTag } = encryptedPayload;

  if (!ciphertext || !iv || !authTag) {
    throw new Error('decryptToken: Payload must contain ciphertext, iv, and authTag.');
  }

  const key = deriveEncryptionKey(secret);
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH
  });

  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

