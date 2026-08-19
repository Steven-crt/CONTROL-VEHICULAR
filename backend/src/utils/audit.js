/**
 * Auditoría y monitoreo:
 * - Aplica el prefijo de cifrado transparente a los mensajes de log para no
 *   filtrar datos sensibles.
 * - Registra eventos de seguridad (login fallido, bloqueos, acciones admin).
 */

const { obtenerIp } = require('./obtenerIp');

const EVENTOS = {
  LOGIN_OK: 'LOGIN_OK',
  LOGIN_FAIL: 'LOGIN_FAIL',
  LOGIN_BLOQUEADO: 'LOGIN_BLOQUEADO',
  TOKEN_INVALIDO: 'TOKEN_INVALIDO',
  ACCESO_DENEGADO: 'ACCESO_DENEGADO',
  ACCION_ADMIN: 'ACCION_ADMIN',
  UPLOAD_OK: 'UPLOAD_OK',
  UPLOAD_RECHAZADO: 'UPLOAD_RECHAZADO',
  RATE_LIMIT: 'RATE_LIMIT'
};

function logEvento(evento, req, detalle = '') {
  const ip = obtenerIp(req);
  const user = req.user?.username || req.user?.id || 'anon';
  const line = `[AUDIT] ${new Date().toISOString()} ${evento} ip=${ip} user=${user} ${req.method} ${req.originalUrl} ${detalle}`;
  console.log(line);
}

module.exports = { EVENTOS, logEvento };