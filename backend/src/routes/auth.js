const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getRol } = require('../utils/roles');
const { getJwtSecret } = require('../utils/jwtSecret');
const { obtenerIp } = require('../utils/obtenerIp');
const { EVENTOS, logEvento } = require('../utils/audit');
const { COOKIE_SESION } = require('../middleware/auth');
require('dotenv').config();

// Rate limiting en memoria para prevenir brute force en login.
// NOTA: en un despliegue multi-instancia esto debería ser Redis; para una sola
// instancia es suficiente y evita la dependencia extra.
// Estructura: { ip_usuario: { intentos, primeraFalla, bloqueadoHasta } }
const intentosFallidos = new Map();
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

// Barrer periódicamente entradas viejas para evitar fuga de memoria
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, reg] of intentosFallidos) {
    if (ahora - reg.primeraFalla > VENTANA_MS && (!reg.bloqueadoHasta || ahora > reg.bloqueadoHasta)) {
      intentosFallidos.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();

// La IP se resuelve con req.ip (Express + trust proxy). NO se lee
// x-forwarded-for crudo: el cliente puede falsificarlo y saltarse el bloqueo.
// (obtenerIp importado de ../utils/obtenerIp)

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
  const ip = obtenerIp(req);

  // Honeypot anti-bots: si el campo oculto "website" viene lleno, es un bot.
  // El frontend legítimo JAMÁS envía este campo.
  if (req.body?.website) {
    logEvento(EVENTOS.LOGIN_BLOQUEADO, req, 'honeypot');
    return res.status(400).json({ error: 'Solicitud inválida' });
  }

  // Verificar rate limit
  const limiteEstado = checkRateLimit(ip);
  if (limiteEstado.bloqueado) {
    logEvento(EVENTOS.LOGIN_BLOQUEADO, req, `ip bloqueada, retry en ${limiteEstado.segsRestantes}s`);
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
      logEvento(EVENTOS.LOGIN_FAIL, req, `usuario=${username.trim()}`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];
    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) {
      registrarFallo(ip);
      logEvento(EVENTOS.LOGIN_FAIL, req, `usuario=${usuario.username}`);
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

    // Cookie de sesión httpOnly: no accesible desde JS (protege contra XSS).
    // SameSite=None + Secure porque frontend (Vercel) y API (Render) están en
    // dominios distintos. HttpOnly impide lectura por scripts maliciosos.
    const cookieSecure = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_SESION, token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSecure ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8h, igual que el JWT
      path: '/'
    });

    logEvento(EVENTOS.LOGIN_OK, req, `usuario=${usuario.username}`);

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

// POST /api/auth/logout — limpia la cookie de sesión
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_SESION, { path: '/', httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Sesión cerrada' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const cookieToken = req.cookies?.[COOKIE_SESION];
  const token = cookieToken || (authHeader ? authHeader.split(' ')[1] : null);
  if (!token) return res.status(401).json({ error: 'No autorizado' });
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