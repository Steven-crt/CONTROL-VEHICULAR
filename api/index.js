require('mysql2');
require('bcryptjs');
require('express');
require('sequelize');
require('jsonwebtoken');

let app;

try {
  app = require('../backend/src/app');

  const { Ubicacion } = require('../backend/src/models');
  Ubicacion.sync().catch(err => {
    console.error('Error al sincronizar tabla ubicaciones:', err.message);
  });
} catch (err) {
  console.error('[api/index.js] Error al inicializar app:', err.message);

  const express = require('express');
  const fallbackApp = express();
  fallbackApp.use(express.json());

  fallbackApp.all('*', (req, res) => {
    res.status(500).json({ error: 'Error de configuración del servidor. Verifica las variables de entorno.' });
  });

  app = fallbackApp;
}

module.exports = app;
