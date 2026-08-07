const jwt = require('jsonwebtoken');
const db = require('../db');
const { getRol } = require('../utils/roles');
require('dotenv').config();

const authMiddleware = (roles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [rows] = await db.query(
        'SELECT * FROM usuarios WHERE id = ? AND activo = 1',
        [decoded.id]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
      }

      const rol = getRol(rows[0]);
      req.user = { ...decoded, rol };

      if (roles.length > 0 && !roles.includes(rol)) {
        return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
};

module.exports = authMiddleware;
