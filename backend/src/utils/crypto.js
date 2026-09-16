

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) return null;
  const hex = raw.startsWith('hex:') ? raw.slice(4) : raw;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    console.warn('⚠️  DATA_ENCRYPTION_KEY no es un hex de 32 bytes (64 chars). Se ignora la clave.');
    return null;
  }
  return Buffer.from(hex, 'hex');
}


function encrypt(value) {
  const key = getKey();
  if (!key || value === null || value === undefined || typeof value !== 'string') return value;
  if (value.startsWith(PREFIX)) return value; // ya cifrado
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`;
}


function decrypt(value) {
  const key = getKey();
  if (!key || value === null || value === undefined || typeof value !== 'string') return value;
  if (!value.startsWith(PREFIX)) return value;
  try {
    const payload = value.slice(PREFIX.length).split(':');
    if (payload.length !== 3) return value;
    const iv = Buffer.from(payload[0], 'base64url');
    const tag = Buffer.from(payload[1], 'base64url');
    const data = Buffer.from(payload[2], 'base64url');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return value;
  }
}

module.exports = { encrypt, decrypt };