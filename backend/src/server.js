require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const app = express();
const db = require('./db');
const cookieParser = require('cookie-parser');
const { getJwtSecret } = require('./utils/jwtSecret');
const { obtenerIp } = require('./utils/obtenerIp');
const { createLimiter } = require('./middleware/rateLimit');

getJwtSecret(); // valida el secreto al arrancar (fail-fast en producción si falta)
app.set('trust proxy', 1); // Render/LB: req.ip lee X-Forwarded-For real (fiable)
app.use(cookieParser()); // req.cookies para sesión httpOnly

// CORS: solo orígenes explícitamente autorizados en CORS_ORIGIN
// NO se permite *.vercel.app genérico — solo los dominios exactos configurados.
// Se añade el mismo-origen (Host == Origin) como caso permitido sin abrir wildcards.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

function buildApiCors(req) {
  return cors({
    origin: (origin, callback) => {
      // Sin cabecera Origin = cliente no navegador (curl, health checks, monitores,
      // Render). CORS solo aplica a navegadores: se deja pasar sin cabeceras CORS.
      if (!origin) {
        return callback(null, true);
      }
      // Si no hay orígenes configurados, bloquear en producción
      if (!allowedOrigins.length && process.env.NODE_ENV === 'production') {
        return callback(new Error('CORS: no hay orígenes permitidos configurados'));
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Mismo origen: validar hostname exacto para evitar bypass via includes()
      // y Host-header poisoning (ej. example.com.evil.com incluye example.com)
      try {
        const originHost = new URL(origin).host;
        const reqHost = (req?.headers?.host || '').split(':')[0];
        // Solo confiar en Host si coincide con un origen permitido (evita poisoning)
        const hostAllowed = allowedOrigins.some(o => {
          try { return new URL(o).host.split(':')[0] === reqHost; } catch { return false; }
        });
        if (hostAllowed && originHost === reqHost) {
          return callback(null, true);
        }
      } catch {}
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    },
    credentials: true
  });
}

// /api/health queda exento del CORS estricto para permitir health checks,
// curl y navegación directa (peticiones sin cabecera Origin)
app.use((req, res, next) => {
  if (req.path === '/api/health' || req.path === '/health') return cors({ origin: allowedOrigins.length ? allowedOrigins : true })(req, res, next);
  return buildApiCors(req)(req, res, next);
});

// Helmet: configura automáticamente todas las cabeceras de seguridad HTTP críticas
// (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS, CSP, etc.)
app.use(helmet({
  // Content-Security-Policy: restringe orígenes de recursos y scripts
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...allowedOrigins.filter(o => o.startsWith('https://'))],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  // HSTS: fuerza HTTPS con preload habilitado
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // X-Frame-Options: DENY — previene clickjacking
  frameguard: { action: 'deny' },
  // Referrer-Policy: no filtrar información sensible a terceros
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // X-Content-Type-Options: nosniff — previene MIME sniffing
  noSniff: true,
  // X-XSS-Protection desactivado intencionalmente (CSP es la protección moderna;
  // el header antiguo puede crear vulnerabilidades en IE)
  xssFilter: false,
  // Permissions-Policy: deshabilitar acceso a cámara, micrófono y geolocalización
  permissionsPolicy: {
    directives: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: []
    }
  },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }
}));

// Límite de tamaño de cuerpo JSON: evita payloads abusivos / DoS
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Compresión gzip de respuestas (payloads ~70% más ligeros = más peticiones por
// segundo con la misma CPU/red). Solo comprime JSON/HTML/texto, no imágenes.
app.use(compression({ threshold: 1024 }));

// Archivos subidos: son inmutables por URL (cada archivo tiene su propio nombre),
// así que se cachean 24h en navegador/CDN sin riesgo de servir contenido viejo.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  fallthrough: false,
  maxAge: '1d',
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=86400')
}));

// Logging de peticiones (método, ruta, estado, duración, IP) sin datos sensibles
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const ip = obtenerIp(req);
    const ruta = (req.originalUrl || req.url || '').replace(/[\r\n]/g, '');
    console.log(`[HTTP] ${res.statusCode} ${req.method} ${ruta} ${ms}ms ip=${ip}`);
  });
  next();
});

// Rate limit global: 100 peticiones por ventana de 15 minutos por IP.
// Usa express-rate-limit (librería oficial) con keyGenerator que lee req.ip
// (resuelto por trust proxy, no X-Forwarded-For crudo que el cliente puede falsificar).
const rateLimitGlobal = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // 100 req por ventana
  standardHeaders: 'draft-7', // Cabeceras RateLimit-* estándar RFC
  legacyHeaders: false, // Deshabilitar cabeceras X-RateLimit-* antiguas
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' },
  keyGenerator: (req) => obtenerIp(req), // IP resuelta por trust proxy
  skip: (req) => req.path === '/api/health' || req.path === '/health'
});
app.use('/api', rateLimitGlobal);

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/configuracion', require('./routes/configuracion'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/vehiculos', require('./routes/vehiculos'));
app.use('/api/combustible', require('./routes/combustible'));
app.use('/api/mantenimiento', require('./routes/mantenimiento'));
app.use('/api/movimiento', require('./routes/movimiento'));
app.use('/api/notificaciones', require('./routes/notificaciones'));
app.use('/api/anomalias', require('./routes/anomalias'));
app.use('/api/realtime', require('./routes/realtime'));

// Health check con diagnóstico de conexión a la base de datos.
// SOLO expone estado de conexión (sin versión MySQL ni estructura de tablas)
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Gestion Vehicular API', health: '/api/health' }));

app.get('/api/health', async (req, res) => {
  const info = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    system: 'Gestión Vehicular',
    db: { connected: false }
  };
  let conn = null;
  try {
    conn = await db.getConnection();
    info.db.connected = true;
  } catch (err) {
    info.status = 'degraded';
    info.db.connected = false;
    console.error('[health] DB error:', err.message);
    info.db.error = 'DB no disponible';
  } finally {
    if (conn) conn.release();
  }
  res.json(info);
});

// Error handler
app.use((err, req, res, next) => {
  // Errores de body-parser (JSON malformado, payload excedido) traen err.status
  // (400/413) y err.type. Se respeta ese código: no son errores internos.
  const status = err?.status || err?.statusCode;
  if (status && status >= 400 && status <= 499) {
    return res.status(status).json({ error: 'Solicitud inválida' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Gestión Vehicular API corriendo en http://localhost:${PORT}`);
  console.log(`✅ CORS habilitado para: ${allowedOrigins.join(', ')}`);
  console.log(`🔍 Diagnóstico: abre http://localhost:${PORT}/api/health para ver el estado de la BD`);
});

module.exports = app;
