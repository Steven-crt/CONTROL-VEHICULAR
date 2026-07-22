const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/clientes
router.get('/', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM clientes ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clientes/:id
router.get('/:id', auth(), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clientes WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes
router.post('/', auth(['admin', 'operador']), async (req, res) => {
  const { nombre, cedula, telefono, email, placa, tipo_membresia, fecha_inicio, fecha_vencimiento } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
  try {
    const clean = (v) => (v === '' || v === undefined) ? null : v;
    const [result] = await db.query(
      'INSERT INTO clientes (nombre, cedula, telefono, email, placa, tipo_membresia, fecha_inicio, fecha_vencimiento) VALUES (?,?,?,?,?,?,?,?)',
      [nombre, cedula, clean(telefono), clean(email), placa?.toUpperCase() || null, tipo_membresia || 'ninguna', clean(fecha_inicio), clean(fecha_vencimiento)]
    );
    res.status(201).json({ id: result.insertId, message: 'Cliente registrado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Cédula ya registrada' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clientes/:id
router.put('/:id', auth(['admin', 'operador']), async (req, res) => {
  const { nombre, cedula, telefono, email, placa, tipo_membresia, fecha_inicio, fecha_vencimiento, activo } = req.body;
  try {
    const clean = (v) => (v === '' || v === undefined) ? null : v;
    await db.query(
      'UPDATE clientes SET nombre=?, cedula=?, telefono=?, email=?, placa=?, tipo_membresia=?, fecha_inicio=?, fecha_vencimiento=?, activo=? WHERE id=?',
      [
        nombre, cedula, clean(telefono), clean(email), placa?.toUpperCase() || null,
        tipo_membresia || 'ninguna', clean(fecha_inicio), clean(fecha_vencimiento),
        activo ?? 1, req.params.id
      ]
    );
    res.json({ message: 'Cliente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    await db.query('UPDATE clientes SET activo=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Cliente desactivado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
