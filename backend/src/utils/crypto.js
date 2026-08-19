/**
 * Cifrado transparente de campos sensibles (AES-256-GCM).
 *
 * - Si DATA_ENCRYPTION_KEY está definido en el entorno (32 bytes hex, 64 chars),
 *   los valores marcados se cifran en la BD y se descifran al leerlos.
 * - Si la clave NO está configurada, encrypt/decrypt son NO-OP (devolver el valor
 *   tal cual) para NO romper la conexión ni el flujo actual en producción.
 * - Compatibilidad con datos antiguos: los valores en texto plano que ya existen
 *   en la BD se siguen leyendo sin problema (solo se descifra lo que tiene el
 *   prefijo enc:v1:).
 *
 * Genera la clave con:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

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

/**
 * Cifra un string. Devuelve `enc:v1:<iv>:<tag>:<cipher>` en base64url.
 * No-op si no hay clave configurada o el valor no es un string.
 */
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

/**
 * Descifra un valor cifrado. Si no tiene prefijo (dato antiguo) o no hay clave,
 * lo devuelve tal cual (compatibilidad con datos en texto plano existentes).
 */
function decrypt(value) {
  const key = getKey();
  if (!key || value === null || value === undefined || typeof value !== 'string') return value;
  if (!value.startsWith(PREFIX)) return value; // dato antiguo en texto plano
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
    return value; // no se puede descifrar: devolver el valor crudo, no romper
  }
}

module.exports = { encrypt, decrypt };