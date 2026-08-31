const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getRol } = require('../utils/roles');
const { getJwtSecret } = require('../utils/jwtSecret');
const { obtenerIp } = require('../utils/obtenerIp');
const { EVENTOS, logEvento } = require('../utils/audit');
const { COOKIE_SESION } = require('../middleware/auth');
const { crearPedido2FA, consumirPedido2FA, verificarTOTP } = require('../utils/twoFA');
const { encrypt, decrypt } = require('../utils/crypto');
require('dotenv').config();


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

    // Login exitoso hasta este punto — si el usuario tiene 2FA activo,
    // NO emitimos JWT todavía: pedimos el código OTP.
    logEvento(EVENTOS.LOGIN_OK, req, `usuario=${usuario.username}`);

    // Si no existe la columna, asumir sin 2FA (compatibilidad con BD que no migró)
    const tiene2FA = (usuario.twofa_activo === 1 || usuario.twofa_activo === '1') && usuario.twofa_secreto;

    if (tiene2FA) {
      const firma2FA = crearPedido2FA(usuario.id);
      // Limpiar intentos fallidos solo tras completar el 2FA (evita saltarse
      // el 2FA reintentando el login y obtenerlo ilimitado)
      return res.json({
        requiere2FA: true,
        firma2FA,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          username: usuario.username,
          rol: getRol(usuario)
        }
      });
    }

    // Login exitoso — limpiar intentos fallidos
    limpiarIntentosExitoso(ip);

    const rol = getRol(usuario);

    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, nombre: usuario.nombre, rol },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h', jwtid: crypto.randomUUID() }
    );


    const cookieSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
    const cookieSameSite = (() => {
      const v = (process.env.COOKIE_SAMESITE || '').toLowerCase();
      if (v === 'none' || v === 'lax' || v === 'strict') return v;
      // default seguro según entorno: none en prod cross-origin, lax en dev
      return cookieSecure ? 'none' : 'lax';
    })();
    if (cookieSameSite === 'none' && !cookieSecure) {
      return res.status(500).json({ error: 'Configuración de cookie inválida: SameSite=None requiere Secure' });
    }
    // maxAge sincronizado con JWT_EXPIRES_IN (evita cookie viva con token expirado)
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    let maxAgeMs = 8 * 60 * 60 * 1000;
    try {
      const m = expiresIn.match(/^(\d+)([smhd])$/);
      if (m) {
        const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        maxAgeMs = parseInt(m[1], 10) * mult[m[2]];
      } else if (!isNaN(Number(expiresIn))) {
        maxAgeMs = Number(expiresIn) * 1000;
      }
    } catch {}
    res.cookie(COOKIE_SESION, token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: maxAgeMs,
      path: '/'
    });

    logEvento(EVENTOS.LOGIN_OK, req, `usuario=${usuario.username}`);

    // No exponer token en JSON cuando la sesión es httpOnly (evita robo vía XSS/localStorage)
    // Solo se devuelve usuario; el token viaja en cookie.
    res.json({
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

// POST /api/auth/2fa/verify — completa el login con 2FA
// body: { firma2FA, codigo }
router.post('/2fa/verify', async (req, res) => {
  const ip = obtenerIp(req);

  // Backoff de reintentos por IP reutilizando el mismo mecanismo del login
  const limiteEstado = checkRateLimit(ip);
  if (limiteEstado.bloqueado) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos segundos.' });
  }

  const { firma2FA, codigo } = req.body;
  if (!firma2FA || !codigo) {
    return res.status(400).json({ error: 'Firma y código requeridos' });
  }

  try {
    const usuarioId = consumirPedido2FA(String(firma2FA));
    if (!usuarioId) {
      // Pedido inválido/expirado/single-use ya consumido
      return res.status(401).json({ error: 'Sesión de verificación expirada' });
    }

    const [rows] = await db.query(
      'SELECT id, username, nombre, email, rol_id, rol, twofa_secreto, twofa_activo FROM usuarios WHERE id = ? AND activo = 1',
      [usuarioId]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const usuario = rows[0];
    if (usuario.twofa_activo !== 1 || !usuario.twofa_secreto) {
      return res.status(400).json({ error: '2FA no está activo para este usuario' });
    }

    const secreto = decrypt(usuario.twofa_secreto);
    const valido = verificarTOTP(secreto, codigo);
    if (!valido) {
      registrarFallo(ip);
      logEvento(EVENTOS.LOGIN_BLOQUEADO, req, `2FA inválido usuario=${usuario.username}`);
      return res.status(401).json({ error: 'Código de verificación incorrecto' });
    }

    // 2FA correcto → emitir JWT real
    limpiarIntentosExitoso(ip);

    const rol = getRol({ rol_id: usuario.rol_id, rol: usuario.rol });
    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, nombre: usuario.nombre, rol },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h', jwtid: crypto.randomUUID() }
    );

    const cookieSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
    const cookieSameSite = (() => {
      const v = (process.env.COOKIE_SAMESITE || '').toLowerCase();
      if (v === 'none' || v === 'lax' || v === 'strict') return v;
      return cookieSecure ? 'none' : 'lax';
    })();
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    let maxAgeMs = 8 * 60 * 60 * 1000;
    try {
      const m = expiresIn.match(/^(\d+)([smhd])$/);
      if (m) { const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }; maxAgeMs = parseInt(m[1], 10) * mult[m[2]]; }
      else if (!isNaN(Number(expiresIn))) { maxAgeMs = Number(expiresIn) * 1000; }
    } catch {}

    res.cookie(COOKIE_SESION, token, {
      httpOnly: true, secure: cookieSecure, sameSite: cookieSameSite, maxAge: maxAgeMs, path: '/'
    });

    logEvento(EVENTOS.LOGIN_OK, req, `2FA OK usuario=${usuario.username}`);
    res.json({
      usuario: {
        id: usuario.id, nombre: usuario.nombre, username: usuario.username,
        email: usuario.email, rol
      }
    });
  } catch (err) {
    console.error('❌ Error en POST /api/auth/2fa/verify:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout — limpia la cookie de sesión
// Debe usar los mismos atributos que el login para que el navegador la borre
router.post('/logout', (req, res) => {
  const cookieSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const cookieSameSite = (() => {
    const v = (process.env.COOKIE_SAMESITE || '').toLowerCase();
    if (v === 'none' || v === 'lax' || v === 'strict') return v;
    return cookieSecure ? 'none' : 'lax';
  })();
  res.clearCookie(COOKIE_SESION, {
    path: '/',
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite
  });
  res.json({ message: 'Sesión cerrada' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const cookieToken = req.cookies?.[COOKIE_SESION];
  const token = cookieToken || (authHeader ? authHeader.split(' ')[1] : null);
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    // rol_id es obligatorio en el SELECT: getRol lo prioriza. Si la fila no
    // lo tuviera, se cae al rol firmado en el token (decoded.rol).
    const [rows] = await db.query(
      'SELECT id, nombre, username, email, rol_id FROM usuarios WHERE id = ? AND activo = 1',
      [decoded.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = rows[0];
    res.json({
      id: u.id,
      nombre: u.nombre,
      username: u.username,
      email: u.email,
      rol: getRol({ rol_id: u.rol_id, rol: decoded.rol })
    });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;