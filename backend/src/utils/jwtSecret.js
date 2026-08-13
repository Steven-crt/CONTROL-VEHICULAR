/**
 * Secreto para firmar tokens JWT.
 * - Si JWT_SECRET está en el entorno, se usa tal cual.
 * - En desarrollo (sin JWT_SECRET) se genera uno aleatorio efímero por arranque.
 * - En producción el arranque FALLA si falta, para nunca operar con un secreto conocido.
 */

const crypto = require('crypto');

let ephemeral = null;

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s) {
    if (s.length < 32) {
      console.warn('⚠️  JWT_SECRET es demasiado corto (<32 chars). Usa un valor generado con crypto.randomBytes.');
    }
    return s;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET no está configurado. Añádelo en Render > Environment ' +
      '(genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))")'
    );
  }
  if (!ephemeral) {
    ephemeral = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  JWT_SECRET no configurado — usando secreto efímero para desarrollo. Los tokens expirarán al reiniciar.');
  }
  return ephemeral;
}

module.exports = { getJwtSecret };
