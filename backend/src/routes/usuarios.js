const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// GET /api/usuarios
router.get('/', auth(['admin']), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, username, email, rol, activo, created_at FROM usuarios ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/:id
router.get('/:id', auth(['admin']), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, username, email, rol, activo FROM usuarios WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios
router.post('/', auth(['admin']), async (req, res) => {
  const { nombre, username, password, email, rol } = req.body;
  if (!nombre || !username || !password)
    return res.status(400).json({ error: 'Nombre, usuario y contraseña son requeridos' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, username, password, email, rol) VALUES (?, ?, ?, ?, ?)',
      [nombre, username, hash, email, rol || 'operador']
    );
    res.status(201).json({ id: result.insertId, message: 'Usuario creado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', auth(['admin']), async (req, res) => {
  const { nombre, email, rol, activo, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE usuarios SET nombre=?, email=?, rol=?, activo=?, password=? WHERE id=?',
        [nombre, email, rol, activo, hash, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET nombre=?, email=?, rol=?, activo=? WHERE id=?',
        [nombre, email, rol, activo, req.params.id]
      );
    }
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET activo=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
