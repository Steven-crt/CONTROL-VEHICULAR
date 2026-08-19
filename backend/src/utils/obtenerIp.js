/**
 * Resolución robusta de la IP del cliente.
 * - Con `trust proxy` activado, req.ip ya usa X-Forwarded-For resuelto por
 *   Express/Render de forma fiable.
 * - NO leer req.headers['x-forwarded-for'] directamente: el cliente puede
 *   falsificar ese header y así saltarse el rate limiting por IP.
 */

function obtenerIp(req) {
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown'
  );
}

module.exports = { obtenerIp };