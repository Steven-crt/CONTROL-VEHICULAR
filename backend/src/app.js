require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const isServerless = !process.env.PORT && process.env.VERCEL;

let accessLogStream = null;
let errorLogStream = null;

if (!isServerless) {
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    accessLogStream = fs.createWriteStream(
      path.join(logDir, 'access.log'),
      { flags: 'a' }
    );
    errorLogStream = fs.createWriteStream(
      path.join(logDir, 'error.log'),
      { flags: 'a' }
    );

    const origConsoleError = console.error;
    console.error = (...args) => {
      const message = args.map(a => typeof a === 'object' ? (a.stack || JSON.stringify(a, null, 2)) : String(a)).join(' ');
      if (errorLogStream) errorLogStream.write(`[${new Date().toISOString()}] ${message}\n`);
      origConsoleError.apply(console, args);
    };
  } catch (e) {
    // Silently skip filesystem setup in serverless environments
  }
}

const { limiterGeneral, limiterAuth, sanitizarInput, verificarSQLInjection, ocultarErrores } = require('./middlewares/security');
const AppError = require('./utils/AppError');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.disable('x-powered-by');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5175',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (!isServerless && accessLogStream) {
  app.use(morgan(':remote-addr - [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', { stream: accessLogStream }));
}

app.use(sanitizarInput);
app.use(verificarSQLInjection);

app.use('/api/auth/login', limiterAuth);
app.use('/api', limiterGeneral);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/vehiculos', require('./routes/vehiculos'));
app.use('/api/solicitudes-combustible', require('./routes/solicitudesCombustible'));
app.use('/api/mantenimientos', require('./routes/mantenimientos'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/asignaciones', require('./routes/asignaciones'));
app.use('/api/proveedores', require('./routes/proveedores'));
app.use('/api/notificaciones', require('./routes/notificaciones'));
app.use('/api/ubicaciones', require('./routes/ubicaciones'));
app.use('/api', require('./routes/catalogos'));

app.use(ocultarErrores);
app.use((err, req, res, next) => {
  if (errorLogStream) {
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url}\n${err.name}: ${err.message}\n${err.stack}\n\n`;
    errorLogStream.write(logLine);
  }
  console.error(`[ERROR] ${req.method} ${req.url} → ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
  }

  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
