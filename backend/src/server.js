require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const db = require('./db');
const { getJwtSecret } = require('./utils/jwtSecret');

getJwtSecret(); // valida el secreto al arrancar (fail-fast en producción si falta)
app.set('trust proxy', 1); // Render/LB: req.ip lee X-Forwarded-For real

// CORS: solo orígenes explícitamente autorizados en CORS_ORIGIN
// NO se permite *.vercel.app genérico — solo los dominios exactos configurados
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const apiCors = cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin solo en desarrollo local
    if (!origin) {
      const isLocalDev = process.env.NODE_ENV !== 'production';
      return isLocalDev
        ? callback(null, true)
        : callback(new Error('CORS: origen requerido en producción'));
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true
});

// /api/health queda exento del CORS estricto para permitir health checks,
// curl y navegación directa (peticiones sin cabecera Origin)
app.use((req, res, next) => {
  if (req.path === '/api/health') return cors({ origin: true })(req, res, next);
  return apiCors(req, res, next);
});

// Cabeceras de seguridad mínimas (equivalentes a helmet para esta API)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { fallthrough: false }));

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

// Health check con diagnóstico de conexión a la base de datos
const TABLAS_REQUERIDAS = ['usuarios', 'vehiculos', 'tipos_vehiculo', 'solicitudes_combustible', 'mantenimientos', 'configuracion', 'ubicaciones'];

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
    try {
      const [[{ version }]] = await conn.query('SELECT VERSION() AS version');
      info.db.mysql_version = version;
    } catch {}

    const [tabs] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
      [TABLAS_REQUERIDAS]
    );
    const presentes = new Set(tabs.map(t => t.TABLE_NAME));
    info.db.tablas_presentes = TABLAS_REQUERIDAS.filter(t => presentes.has(t));
    info.db.tablas_faltantes = TABLAS_REQUERIDAS.filter(t => !presentes.has(t));

    try {
      const [[r]] = await conn.query('SELECT COUNT(*) AS n FROM usuarios');
      info.db.usuarios = r.n;
    } catch {}
    try {
      const [[r]] = await conn.query('SELECT COUNT(*) AS n FROM vehiculos');
      info.db.vehiculos = r.n;
    } catch {}
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
