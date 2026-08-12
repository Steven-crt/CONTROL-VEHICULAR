/**
 * Devuelve el secreto JWT configurado o un valor por defecto.
 * Si falta JWT_SECRET en producción, se advierte una sola vez para que
 * el login no falle con "secretOrPrivateKey must have a value".
 */

const FALLBACK_SECRET = 'control-vehicular-fallback-secret';
let warned = false;

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  if (!warned) {
    console.warn('⚠️  JWT_SECRET no está configurado. Usando secreto por defecto (configúralo en Render).');
    warned = true;
  }
  return FALLBACK_SECRET;
}

module.exports = { getJwtSecret };
