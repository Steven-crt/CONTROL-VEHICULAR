const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Claves que NUNCA deben exponerse al cliente aunque estén en la tabla
const CLAVES_PRIVADAS = ['jwt_secret', 'db_password', 'api_key', 'webhook_secret'];

// GET /api/configuracion — requiere autenticación válida
router.get('/', auth(), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT clave, valor FROM configuracion');
    const config = {};
    rows.forEach(r => {
      // Filtrar claves sensibles que no deben llegar al frontend
      if (!CLAVES_PRIVADAS.includes(r.clave.toLowerCase())) {
        config[r.clave] = r.valor;
      }
    });
    res.json(config);
  } catch (err) {
    console.error('Error en GET /api/configuracion:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/configuracion — solo admin
router.put('/', auth(['admin']), async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return res.status(400).json({ error: 'No hay datos para actualizar' });

  // Sanitizar: solo strings, sin claves privadas, límite de longitud
  const entradaValida = entries.filter(([clave, valor]) => {
    if (CLAVES_PRIVADAS.includes(clave.toLowerCase())) return false;
    if (typeof clave !== 'string' || clave.length > 100) return false;
    if (typeof valor !== 'string' && typeof valor !== 'number') return false;
    return true;
  });

  if (!entradaValida.length) return res.status(400).json({ error: 'Ningún dato válido para actualizar' });

  try {
    for (const [clave, valor] of entradaValida) {
      await db.query(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor=?',
        [clave, String(valor), String(valor)]
      );
    }
    res.json({ message: 'Configuración actualizada' });
  } catch (err) {
    console.error('Error en PUT /api/configuracion:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
