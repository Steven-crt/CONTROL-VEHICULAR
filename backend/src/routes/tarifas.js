const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/tarifas
router.get('/', auth(), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tarifas ORDER BY tipo_vehiculo, modalidad');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tarifas
router.post('/', auth(['admin']), async (req, res) => {
  const { tipo_vehiculo, modalidad, precio, tiempo_gracia, descripcion } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO tarifas (tipo_vehiculo, modalidad, precio, tiempo_gracia, descripcion) VALUES (?,?,?,?,?)',
      [tipo_vehiculo, modalidad, precio, tiempo_gracia || 10, descripcion || '']
    );
    res.status(201).json({ id: result.insertId, message: 'Tarifa creada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tarifas/:id
router.put('/:id', auth(['admin']), async (req, res) => {
  const { tipo_vehiculo, modalidad, precio, tiempo_gracia, descripcion, activo } = req.body;
  try {
    await db.query(
      'UPDATE tarifas SET tipo_vehiculo=?, modalidad=?, precio=?, tiempo_gracia=?, descripcion=?, activo=? WHERE id=?',
      [tipo_vehiculo, modalidad, precio, tiempo_gracia, descripcion, activo ?? 1, req.params.id]
    );
    res.json({ message: 'Tarifa actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tarifas/:id
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    await db.query('UPDATE tarifas SET activo=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Tarifa desactivada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
