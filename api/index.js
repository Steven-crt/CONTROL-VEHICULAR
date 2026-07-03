// Explicit requires to prevent Vercel tree-shaking
require('mysql2');
require('bcryptjs');
require('express');
require('sequelize');
require('jsonwebtoken');

let handler;
try {
  const app = require('../backend/src/app');
  handler = app;
} catch (err) {
  console.error('INIT ERROR:', err.message);
  handler = (req, res) => {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack?.split('\n').slice(0, 15) });
  };
}
module.exports = handler;
