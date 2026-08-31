const jwt = require('jsonwebtoken');
const db = require('../db');
const { getRol } = require('../utils/roles');
const { getJwtSecret } = require('../utils/jwtSecret');
const { EVENTOS, logEvento } = require('../utils/audit');
require('dotenv').config();

// Nombre de la cookie de sesión httpOnly
const COOKIE_SESION = 'cv_session';


const CACHE_TTL_MS = 10000;
const userCache = new Map();

async function verificarUsuario(id) {
  const ahora = Date.now();
  const hit = userCache.get(id);
  if (hit && ahora - hit.ts < CACHE_TTL_MS) return hit.usuario;
  const [rows] = await db.query(
    'SELECT id, username, nombre, rol_id, activo, email FROM usuarios WHERE id = ? AND activo = 1',
    [id]
  );
  const usuario = rows.length > 0 ? rows[0] : null;
  userCache.set(id, { ts: ahora, usuario });
  if (userCache.size > 500) {
    for (const [k, v] of userCache) {
      if (ahora - v.ts >= CACHE_TTL_MS) userCache.delete(k);
    }
  }
  return usuario;
}

function tokenDeRequest(req) {
  // 1) Cookie httpOnly (mecanismo principal y más seguro)
  const cookieToken = req.cookies?.[COOKIE_SESION];
  if (cookieToken && typeof cookieToken === 'string' && /^[A-Za-z0-9-_]+=*\.[A-Za-z0-9-_]+=*\.[A-Za-z0-9-_]+=*$/.test(cookieToken)) {
    return cookieToken;
  }
  // 2) Header Authorization (compatibilidad con clientes que envían Bearer)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

const authMiddleware = (roles = []) => {
  return async (req, res, next) => {
    const token = tokenDeRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    } catch (jwtErr) {
      // Error de JWT (token expirado, firma inválida, etc.): registrar y rechazar.
      logEvento(EVENTOS.TOKEN_INVALIDO, req, jwtErr.message);
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    try {
      const usuario = await verificarUsuario(decoded.id);
      if (!usuario) {
        return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
      }

      const rol = getRol(usuario);
      req.user = { ...decoded, rol };

      if (roles.length > 0 && !roles.includes(rol)) {
        logEvento(EVENTOS.ACCESO_DENEGADO, req, `rol=${rol} requiere=${roles.join(',')}`);
        return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
      }
      next();
    } catch (err) {
      if (err && (err.code === 'POOL_ENQUEUELIMIT' || err.code === 'POOL_BUSY' || err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT' || String(err.message || '').includes('Queue limit reached'))) {
        return res.status(503).json({ error: 'Servicio saturado, intenta de nuevo en unos segundos' });
      }
      console.error('[auth] Error inesperado verificando usuario:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

module.exports = authMiddleware;
module.exports.COOKIE_SESION = COOKIE_SESION;