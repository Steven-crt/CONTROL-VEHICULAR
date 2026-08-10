require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS: acepta múltiples orígenes separados por coma en CORS_ORIGIN
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Permitir cualquier subdominio de vercel.app en desarrollo
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), system: 'Gestión Vehicular' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Gestión Vehicular API corriendo en http://localhost:${PORT}`);
  console.log(`✅ CORS habilitado para: ${allowedOrigins.join(', ')} + *.vercel.app`);
});

module.exports = app;
