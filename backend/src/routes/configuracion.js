const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/configuracion
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT clave, valor FROM configuracion');
    const config = {};
    rows.forEach(r => { config[r.clave] = r.valor; });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/configuracion
router.put('/', auth(['admin']), async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return res.status(400).json({ error: 'No hay datos para actualizar' });
  try {
    for (const [clave, valor] of entries) {
      await db.query(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor=?',
        [clave, valor, valor]
      );
    }
    res.json({ message: 'Configuración actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
