require('mysql2');
require('bcryptjs');
require('express');
require('sequelize');
require('jsonwebtoken');

const app = require('../backend/src/app');

// Asegurar que la tabla de ubicaciones exista (crea la tabla si no existe)
const { Ubicacion } = require('../backend/src/models');
Ubicacion.sync().catch(err => {
  console.error('Error al sincronizar tabla ubicaciones:', err.message);
});

module.exports = app;
