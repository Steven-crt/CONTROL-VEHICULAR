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

getJwtSecret();
app.set('trust proxy', 1);
app.use(cookieParser());


const ES_PRODUCCION = process.env.NODE_ENV === 'production';

// Allowlist exacta de origenes. Se normaliza sin barra final para que la
// comparacion sea literal y no dependa de como el navegador formatee el Origin.
const allowedOrigins = (() => {
  const configurados = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (configurados.length) return configurados;

  // Fail-closed: en produccion no hay ningun origen implicito. Si CORS_ORIGIN
  // falta o es invalido, la API rechaza el acceso cross-origin en vez de abrirlo.
  return ES_PRODUCCION ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'];
})();

function isOriginAllowed(origin) {
  // Sin cabecera Origin no hay contexto cross-origin (curl, health checks,
  // apps moviles): la peticion no queda sujeta a CORS.
  if (!origin) return true;
  return allowedOrigins.includes(origin.trim().replace(/\/$/, ''));
}

const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

function buildApiCors() {
  return cors({
    origin(origin, callback) {
      if (ES_PRODUCCION && !allowedOrigins.length) {
        return callback(new Error('CORS: CORS_ORIGIN no esta configurado en produccion'));
      }
      // false => el middleware NO emite Access-Control-Allow-Origin, por lo que
      // el navegador bloquea la respuesta. No se devuelve 500 ni se filtra datos.
      return callback(null, isOriginAllowed(origin));
    },
    credentials: true,
    methods: CORS_METHODS,
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
    optionsSuccessStatus: 204
  });
}

// Una sola politica CORS para toda la API (incluido /api/health): antes el health
// check usaba un allowlist distinto y caia en `origin: true` (refleja cualquier
// origen) cuando la lista quedaba vacia.
app.use(buildApiCors());

// Segunda capa: los metodos mutables se rechazan con 403 si el origen no esta
// en la allowlist. CORS protege la lectura desde el navegador; esto blinda tambien
// a clientes no-navegador que ignorarian la cabecera.
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  if (!isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'Origen de petición no permitido' });
  }
  next();
});


app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // Sin 'unsafe-inline' en style-src: los bloques <style> y CSSOM solo se
      // permiten desde 'self'. Los atributos style="" dinámicos (barras de
      // combustible, tooltips) siguen habilitados vía style-src-attr, que es
      // un subconjunto de superficie: no permite inyectar reglas CSS.
      styleSrc: ["'self'"],
      styleSrcElem: ["'self'"],
      styleSrcAttr: ["'unsafe-inline'"],
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

  frameguard: { action: 'deny' },

  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  noSniff: true,
  
  xssFilter: false,

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


app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));


app.use(compression({ threshold: 1024 }));


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
  console.log(`🔍 Diagnóstico: abre http://localhost:${PORT}/api/health para ver el estado de la BD`);
  if (!allowedOrigins.length) {
    console.error('⛔ CORS: allowlist vacía. Configura CORS_ORIGIN; la API rechazará todo acceso cross-origin.');
  } else {
    console.log(`✅ CORS habilitado para: ${allowedOrigins.join(', ')}`);
  }
});

module.exports = app;

