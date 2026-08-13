const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getRol } = require('../utils/roles');
const { getJwtSecret } = require('../utils/jwtSecret');
require('dotenv').config();

// Rate limiting simple en memoria para prevenir brute force en login
// Estructura: { ip_usuario: { intentos, bloqueadoHasta } }
const intentosFallidos = new Map();
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(ip) {
  const ahora = Date.now();
  const registro = intentosFallidos.get(ip);
  if (!registro) return { bloqueado: false };
  if (registro.bloqueadoHasta && ahora < registro.bloqueadoHasta) {
    const segsRestantes = Math.ceil((registro.bloqueadoHasta - ahora) / 1000);
    return { bloqueado: true, segsRestantes };
  }
  // Limpiar si ya expiró la ventana
  if (ahora - registro.primeraFalla > VENTANA_MS) {
    intentosFallidos.delete(ip);
    return { bloqueado: false };
  }
  return { bloqueado: false };
}

function registrarFallo(ip) {
  const ahora = Date.now();
  const registro = intentosFallidos.get(ip) || { intentos: 0, primeraFalla: ahora };
  registro.intentos += 1;
  if (registro.intentos >= MAX_INTENTOS) {
    registro.bloqueadoHasta = ahora + VENTANA_MS;
  }
  intentosFallidos.set(ip, registro);
}

function limpiarIntentosExitoso(ip) {
  intentosFallidos.delete(ip);
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

  // Verificar rate limit
  const limiteEstado = checkRateLimit(ip);
  if (limiteEstado.bloqueado) {
    return res.status(429).json({
      error: `Demasiados intentos fallidos. Intenta nuevamente en ${limiteEstado.segsRestantes} segundos.`
    });
  }

  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  // Sanitización básica — previene payloads de inyección vía JSON
  if (typeof username !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Formato de credenciales inválido' });

  if (username.length > 100 || password.length > 200)
    return res.status(400).json({ error: 'Credenciales demasiado largas' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE username = ? AND activo = 1',
      [username.trim()]
    );
    if (rows.length === 0) {
      registrarFallo(ip);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];
    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) {
      registrarFallo(ip);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Login exitoso — limpiar intentos fallidos
    limpiarIntentosExitoso(ip);

    const rol = getRol(usuario);

    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, nombre: usuario.nombre, rol },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        email: usuario.email,
        rol
      }
    });
  } catch (err) {
    // NUNCA exponer el mensaje interno al cliente
    console.error('❌ Error en POST /api/auth/login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const [rows] = await db.query(
      'SELECT id, nombre, username, email FROM usuarios WHERE id = ? AND activo = 1',
      [decoded.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = rows[0];
    res.json({
      id: u.id,
      nombre: u.nombre,
      username: u.username,
      email: u.email,
      rol: getRol(u)
    });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
