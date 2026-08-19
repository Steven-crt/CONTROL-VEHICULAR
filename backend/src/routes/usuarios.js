const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { getRol } = require('../utils/roles');
const { getRolColumn, rolValueToStore } = require('../utils/rolColumn');
const { internalError } = require('../utils/httpErrors');
const { str, num, email, bool, body } = require('../utils/validate');
const { encrypt, decrypt } = require('../utils/crypto');
const { EVENTOS, logEvento } = require('../utils/audit');

const LIMIT_MAX = 200;

function parseLimit(valor) {
  const n = parseInt(valor, 10);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(n, LIMIT_MAX);
}

// GET /api/usuarios — con paginación (límite de respuesta)
router.get('/', auth(['admin']), async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  try {
    const col = await getRolColumn();
    const rolSelect = col.name ? `${col.name} AS rol` : 'NULL AS rol';
    const [rows] = await db.query(
      `SELECT id, nombre, username, email, ${rolSelect}, activo, created_at
       FROM usuarios ORDER BY nombre LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    rows.forEach(u => {
      u.rol = getRol(u);
      if (u.email) u.email = decrypt(u.email); // descifrar email sensible
    });
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM usuarios');
    res.json({ data: rows, total, limit, offset });
  } catch (err) {
    internalError(res, err, 'usuarios');
  }
});

// GET /api/usuarios/:id
router.get('/:id', auth(['admin']), async (req, res) => {
  try {
    const col = await getRolColumn();
    const rolSelect = col.name ? `${col.name} AS rol` : 'NULL AS rol';
    const [rows] = await db.query(
      `SELECT id, nombre, username, email, ${rolSelect}, activo FROM usuarios WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    rows[0].rol = getRol(rows[0]);
    if (rows[0].email) rows[0].email = decrypt(rows[0].email);
    res.json(rows[0]);
  } catch (err) {
    internalError(res, err, 'usuarios');
  }
});

// POST /api/usuarios — con validación estricta de entradas
router.post('/', auth(['admin']), async (req, res) => {
  const validado = body({
    nombre: [str, { max: 100, required: true, label: 'nombre' }],
    username: [str, { min: 3, max: 50, required: true, label: 'usuario' }],
    password: [str, { min: 8, max: 200, required: true, label: 'contraseña' }],
    email: [email, { max: 100, label: 'email' }],
    rol: [str, { max: 20, label: 'rol' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });

  const { nombre, username, password, email, rol } = validado.values;
  try {
    const col = await getRolColumn();
    const rolValue = await rolValueToStore(rol);
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, username, password, email, ${col.name}) VALUES (?, ?, ?, ?, ?)`,
      [nombre, username, hash, email ? encrypt(email) : null, rolValue ?? 2]
    );
    logEvento(EVENTOS.ACCION_ADMIN, req, `creó usuario id=${result.insertId}`);
    res.status(201).json({ id: result.insertId, message: 'Usuario creado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    internalError(res, err, 'usuarios');
  }
});

// PUT /api/usuarios/:id — con validación y sin manipulación de campos extra
router.put('/:id', auth(['admin']), async (req, res) => {
  const validado = body({
    nombre: [str, { max: 100, label: 'nombre' }],
    email: [email, { max: 100, label: 'email' }],
    rol: [str, { max: 20, label: 'rol' }],
    activo: [bool, { label: 'activo' }],
    password: [str, { min: 8, max: 200, label: 'contraseña' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });

  const { nombre, email: emailVal, rol, activo, password } = validado.values;
  try {
    const col = await getRolColumn();
    const rolValue = await rolValueToStore(rol);
    const rolSet = `${col.name}=?`;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        `UPDATE usuarios SET nombre=?, email=?, ${rolSet}, activo=?, password=? WHERE id=?`,
        [nombre, emailVal ? encrypt(emailVal) : null, rolValue, activo, hash, req.params.id]
      );
    } else {
      await db.query(
        `UPDATE usuarios SET nombre=?, email=?, ${rolSet}, activo=? WHERE id=?`,
        [nombre, emailVal ? encrypt(emailVal) : null, rolValue, activo, req.params.id]
      );
    }
    logEvento(EVENTOS.ACCION_ADMIN, req, `actualizó usuario id=${req.params.id}`);
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    internalError(res, err, 'usuarios');
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    if (parseInt(req.params.id, 10) === req.user?.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
    }
    await db.query('UPDATE usuarios SET activo=0 WHERE id=?', [req.params.id]);
    logEvento(EVENTOS.ACCION_ADMIN, req, `desactivó usuario id=${req.params.id}`);
    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    internalError(res, err, 'usuarios');
  }
});

module.exports = router;