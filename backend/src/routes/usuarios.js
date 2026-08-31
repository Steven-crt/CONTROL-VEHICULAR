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
       FROM usuarios ORDER BY nombre, id LIMIT ? OFFSET ?`,
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
  const idNum = parseInt(req.params.id, 10);
  if (!Number.isFinite(idNum) || idNum < 1) return res.status(400).json({ error: 'ID inválido' });
  try {
    const col = await getRolColumn();
    const rolSelect = col.name ? `${col.name} AS rol` : 'NULL AS rol';
    const [rows] = await db.query(
      `SELECT id, nombre, username, email, ${rolSelect}, activo FROM usuarios WHERE id = ?`,
      [idNum]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    rows[0].rol = getRol(rows[0]);
    if (rows[0].email) rows[0].email = decrypt(rows[0].email);
    res.json(rows[0]);
  } catch (err) {
    internalError(res, err, 'usuarios   ');
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

// PUT /api/usuarios/:id — solo actualiza campos enviados (evita sobrescribir con NULL)
router.put('/:id', auth(['admin']), async (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  if (!Number.isFinite(idNum) || idNum < 1) return res.status(400).json({ error: 'ID inválido' });
  const validado = body({
    nombre: [str, { max: 100, label: 'nombre' }],
    email: [email, { max: 100, label: 'email' }],
    rol: [str, { max: 20, label: 'rol' }],
    activo: [bool, { label: 'activo' }],
    password: [str, { min: 8, max: 200, label: 'contraseña' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });

  try {
    const col = await getRolColumn();
    const sets = [];
    const vals = [];
    if (validado.values.nombre !== null) { sets.push('nombre=?'); vals.push(validado.values.nombre); }
    if (validado.values.email !== null) { sets.push('email=?'); vals.push(encrypt(validado.values.email)); }
    else if (req.body.email === null) { sets.push('email=?'); vals.push(null); }
    if (validado.values.rol !== null) {
      const rolValue = await rolValueToStore(validado.values.rol);
      sets.push(`${col.name}=?`); vals.push(rolValue);
    }
    if (validado.values.activo !== null) {
      const activoVal = validado.values.activo ? 1 : 0;
      sets.push('activo=?'); vals.push(activoVal);
    }
    if (validado.values.password !== null) {
      const hash = await bcrypt.hash(validado.values.password, 10);
      sets.push('password=?'); vals.push(hash);
    }
    if (!sets.length) return res.status(400).json({ error: 'No hay campos para actualizar' });
    vals.push(idNum);
    const [result] = await db.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id=?`, vals);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    logEvento(EVENTOS.ACCION_ADMIN, req, `actualizó usuario id=${idNum}`);
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    internalError(res, err, 'usuarios');
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', auth(['admin']), async (req, res) => {
  const idNum2 = parseInt(req.params.id, 10);
  if (!Number.isFinite(idNum2) || idNum2 < 1) return res.status(400).json({ error: 'ID inválido' });
  try {
    if (idNum2 === req.user?.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
    }
    const [r2] = await db.query('UPDATE usuarios SET activo=0 WHERE id=?', [idNum2]);
    if (r2.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    logEvento(EVENTOS.ACCION_ADMIN, req, `desactivó usuario id=${idNum2}`);
    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    internalError(res, err, 'usuarios');
  }
});

module.exports = router;