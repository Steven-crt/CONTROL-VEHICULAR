const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Usuario, Rol, Sesion } = require('../models');

function generarTokens(usuario) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no esta configurado');
  }

  const accessToken = jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      tipo: 'access',
      jti: crypto.randomBytes(16).toString('hex')
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30m', algorithm: 'HS256' }
  );

  const refreshToken = jwt.sign(
    {
      id: usuario.id,
      tipo: 'refresh',
      jti: crypto.randomBytes(16).toString('hex')
    },
    secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', algorithm: 'HS256' }
  );

  return { accessToken, refreshToken };
}

function parseExpiry(expiry) {
  const match = expiry.match(/^(\d+)\s*(m|h|d)$/);
  if (!match) return 30;
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'm') return val;
  if (unit === 'h') return val * 60;
  if (unit === 'd') return val * 24 * 60;
  return 30;
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({
      where: { email, activo: 1 },
      include: [{ model: Rol, as: 'rol' }]
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    await Sesion.destroy({
      where: { usuario_id: usuario.id }
    });

    const { accessToken, refreshToken } = generarTokens(usuario);

    const accessMinutes = parseExpiry(process.env.JWT_EXPIRES_IN || '30m');
    const refreshMinutes = parseExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '7d');

    const accessExpiresAt = new Date();
    accessExpiresAt.setMinutes(accessExpiresAt.getMinutes() + accessMinutes);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setMinutes(refreshExpiresAt.getMinutes() + refreshMinutes);

    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';

    await Sesion.create({
      usuario_id: usuario.id,
      token: accessToken,
      tipo: 'access',
      ip_address: ip,
      expires_at: accessExpiresAt
    });

    await Sesion.create({
      usuario_id: usuario.id,
      token: refreshToken,
      tipo: 'refresh',
      ip_address: ip,
      expires_at: refreshExpiresAt
    });

    await usuario.update({ ultimo_acceso: new Date() });

    res.json({
      token: accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol.nombre,
        permisos: usuario.rol.permisos
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const secret = process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret);
    } catch (err) {
      return res.status(401).json({ error: 'Refresh token invalido o expirado' });
    }

    if (decoded.tipo !== 'refresh') {
      return res.status(401).json({ error: 'Token invalido' });
    }

    const sesion = await Sesion.findOne({
      where: { token: refreshToken, usuario_id: decoded.id, tipo: 'refresh' }
    });

    if (!sesion) {
      return res.status(401).json({ error: 'Sesion no valida' });
    }

    if (new Date(sesion.expires_at) < new Date()) {
      await Sesion.destroy({ where: { id: sesion.id } });
      return res.status(401).json({ error: 'Refresh token expirado' });
    }

    const usuario = await Usuario.findByPk(decoded.id, {
      include: [{ model: Rol, as: 'rol' }],
      attributes: { exclude: ['password'] }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o desactivado' });
    }

    await Sesion.destroy({ where: { id: sesion.id } });

    const tokens = generarTokens(usuario);

    const accessMinutes = parseExpiry(process.env.JWT_EXPIRES_IN || '30m');
    const refreshMinutes = parseExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '7d');

    const accessExpiresAt = new Date();
    accessExpiresAt.setMinutes(accessExpiresAt.getMinutes() + accessMinutes);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setMinutes(refreshExpiresAt.getMinutes() + refreshMinutes);

    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';

    await Sesion.create({
      usuario_id: usuario.id,
      token: tokens.accessToken,
      tipo: 'access',
      ip_address: ip,
      expires_at: accessExpiresAt
    });

    await Sesion.create({
      usuario_id: usuario.id,
      token: tokens.refreshToken,
      tipo: 'refresh',
      ip_address: ip,
      expires_at: refreshExpiresAt
    });

    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    console.error('Error en refresh:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      include: [{ model: Rol, as: 'rol' }],
      attributes: { exclude: ['password'] }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol.nombre,
        permisos: usuario.rol.permisos
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await Sesion.destroy({ where: { token } });
    }
    if (req.usuario?.id) {
      await Sesion.destroy({ where: { usuario_id: req.usuario.id } });
    }
    res.json({ mensaje: 'Sesion cerrada exitosamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error al cerrar sesion' });
  }
};

exports.cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;

    // Validar tipo y presencia de password_actual
    if (password_actual === undefined || password_actual === null || typeof password_actual !== 'string') {
      return res.status(400).json({ error: 'Contrasena actual invalida o no proporcionada' });
    }

    // Validar tipo y presencia de password_nuevo
    if (password_nuevo === undefined || password_nuevo === null || typeof password_nuevo !== 'string') {
      return res.status(400).json({ error: 'Contrasena nueva invalida o no proporcionada' });
    }

    if (password_nuevo.length < 8) {
      return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 8 caracteres' });
    }

    if (password_nuevo.length > 128) {
      return res.status(400).json({ error: 'La nueva contrasena no puede exceder 128 caracteres' });
    }

    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const valida = await bcrypt.compare(password_actual, usuario.password);
    if (!valida) {
      return res.status(400).json({ error: 'Contrasena actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(password_nuevo, 12);
    await usuario.update({ password: hashedPassword });

    await Sesion.destroy({ where: { usuario_id: usuario.id } });

    res.json({ mensaje: 'Contrasena actualizada exitosamente. Inicie sesion nuevamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contrasena' });
  }
};
