const jwt = require('jsonwebtoken');
const { Usuario, Rol, Sesion } = require('../models');

const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.length < 20) {
      return res.status(401).json({ error: 'Token invalido' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET no esta configurado en las variables de entorno');
      return res.status(500).json({ error: 'Error de configuracion del servidor' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        await Sesion.destroy({ where: { token } }).catch(() => {});
        return res.status(401).json({ error: 'Token expirado, inicie sesion nuevamente' });
      }
      return res.status(401).json({ error: 'Token invalido' });
    }

    const sesionValida = await Sesion.findOne({ where: { token, usuario_id: decoded.id } });
    if (!sesionValida) {
      return res.status(401).json({ error: 'Sesion no valida' });
    }

    if (new Date(sesionValida.expires_at) < new Date()) {
      await Sesion.destroy({ where: { id: sesionValida.id } }).catch(() => {});
      return res.status(401).json({ error: 'Sesion expirada' });
    }

    const usuario = await Usuario.findByPk(decoded.id, {
      include: [{ model: Rol, as: 'rol' }],
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!usuario.activo) {
      await Sesion.destroy({ where: { usuario_id: usuario.id } }).catch(() => {});
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    req.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol.nombre,
      permisos: usuario.rol.permisos,
      sesion_id: sesionValida.id
    };

    next();
  } catch (error) {
    console.error('Error de autenticacion:', error.message);
    return res.status(500).json({ error: 'Error de autenticacion' });
  }
};

const autorizar = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`
      });
    }
    next();
  };
};

module.exports = { autenticar, autorizar };
