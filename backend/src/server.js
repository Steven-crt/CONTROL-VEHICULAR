require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');

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
        return process.env.NODE_ENV !== 'production'
          ? callback(null, true)
          : callback(null, false);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Mismo origen (Host == Origin): peticiones servidas desde el propio dominio
      const host = req?.headers?.host || '';
      if (host && origin.startsWith('http') && origin.includes(host)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    },
    credentials: true
  });
}

// /api/health queda exento del CORS estricto para permitir health checks,
// curl y navegación directa (peticiones sin cabecera Origin)
app.use((req, res, next) => {
  if (req.path === '/api/health') return cors({ origin: true })(req, res, next);
  return buildApiCors(req)(req, res, next);
});

// Cabeceras de seguridad (equivalente a helmet para esta API)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // HSTS: fuerzas HTTPS en navegadores modernos
  if (req.secure || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

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
    const ruta = req.originalUrl || req.url;
    console.log(`[HTTP] ${res.statusCode} ${req.method} ${ruta} ${ms}ms ip=${ip}`);
  });
  next();
});

// Rate limit global por IP sobre la API (protección contra abuso / scraping).
// El login usa su propio limitador más estricto definido en routes/auth.js.
const rateLimitGlobal = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 180, // 180 req/min por IP
  message: 'Demasiadas peticiones. Intenta de nuevo en un minuto.'
});
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return rateLimitGlobal(req, res, next);
});

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

// Health check con diagnóstico de conexión a la base de datos.
// SOLO expone estado de conexión (sin versión MySQL ni estructura de tablas)
const TABLAS_REQUERIDAS = ['usuarios', 'vehiculos', 'tipos_vehiculo', 'solicitudes_combustible', 'mantenimientos', 'configuracion', 'ubicaciones'];

// Respuesta simple en la raíz: Render hace su health check a la URL primaria (sin Origin)
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
    const [tabs] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
      [TABLAS_REQUERIDAS]
    );
    const presentes = new Set(tabs.map(t => t.TABLE_NAME));
    info.db.tablas_presentes = TABLAS_REQUERIDAS.filter(t => presentes.has(t));
    info.db.tablas_faltantes = TABLAS_REQUERIDAS.filter(t => !presentes.has(t));
  } catch (err) {
    info.status = 'degraded';
    info.db.connected = false;
    info.db.error = err.message;
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
