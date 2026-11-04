
const crypto = require('crypto');
const env = require('../config/env');

const AES_KEY = Buffer.from(env.AES_KEY_HEX, 'hex');
const HMAC_KEY = Buffer.from(env.HMAC_KEY_HEX, 'hex');

if (AES_KEY.length !== 32 || HMAC_KEY.length !== 32) {
  throw new Error('Encryption keys must be 32 bytes.');
}

if (AES_KEY.equals(HMAC_KEY)) {
  throw new Error('AES and HMAC keys must be different.');
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function blindIndex(value) {
  return crypto
    .createHmac('sha256', HMAC_KEY)
    .update(normalize(value), 'utf8')
    .digest('hex');
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    AES_KEY,
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64')
  };
}

function decrypt(row, prefix) {
  const ciphertext = row[`${prefix}ciphertext`];
  const iv = row[`${prefix}iv`];
  const tag = row[`${prefix}tag`];

  if (!ciphertext || !iv || !tag) {
    throw new Error('Missing encrypted database fields.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    AES_KEY,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final()
  ]);

  return plaintext.toString('utf8');
}

function hashOtp(otp) {
  return crypto
    .createHmac('sha256', HMAC_KEY)
    .update(String(otp), 'utf8')
    .digest('hex');
}

module.exports = {
  blindIndex,
  encrypt,
  decrypt,
  hashOtp
};
