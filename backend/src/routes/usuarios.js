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
const speakeasy = require('speakeasy');
const { verificarTOTP } = require('../utils/twoFA');

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

// ────────────────────────────────────────────────────────────
// 2FA (TOTP) — gestión del segundo factor de autenticación
// ────────────────────────────────────────────────────────────

// GET /api/usuarios/:id/2fa — devuelve un secreto nuevo + QR (solo el propio
// usuario autenticado, o admin). No persiste nada hasta el "activate".
router.get('/:id/2fa', auth(), async (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  const esAdmin = req.user?.rol === 'admin';
  const esMismo = req.user?.id === idNum;
  if (!esAdmin && !esMismo) return res.status(403).json({ error: 'No autorizado' });
  if (idNum < 1) return res.status(400).json({ error: 'ID inválido' });

  try {
    const [rows] = await db.query('SELECT twofa_activo, username FROM usuarios WHERE id=?', [idNum]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    // Por seguridad, si ya está activo no re-generamos (evita que un atacante
    // con sesión secuestrada cambie el secreto y deje fuera al dueño real).
    if (rows[0].twofa_activo === 1) {
      return res.status(400).json({ error: 'El 2FA ya está activo. Desactívalo antes de volver a configurarlo.' });
    }
    const secret = speakeasy.generateSecret({ name: `GestionVehicular:${rows[0].username}` });
    res.json({
      otpauth_url: secret.otpauth_url,
      base32: secret.base32,
      // URL del QR: el frontend la convierte a imagen con un servicio de QR
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(secret.otpauth_url)}`
    });
  } catch (err) {
    internalError(res, err, '2fa');
  }
});

// POST /api/usuarios/:id/2fa/activate — verifica el código y activa el 2FA
router.post('/:id/2fa/activate', auth(), async (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  const esAdmin = req.user?.rol === 'admin';
  const esMismo = req.user?.id === idNum;
  if (!esAdmin && !esMismo) return res.status(403).json({ error: 'No autorizado' });
  if (idNum < 1) return res.status(400).json({ error: 'ID inválido' });

  const validado = body({
    secreto: [str, { min: 16, max: 200, required: true, label: 'secreto' }],
    codigo: [str, { min: 6, max: 6, required: true, label: 'código' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });

  const { secreto, codigo } = validado.values;
  if (!verificarTOTP(secreto, codigo)) {
    return res.status(400).json({ error: 'El código de verificación no es válido' });
  }

  try {
    const [rows] = await db.query('SELECT twofa_activo FROM usuarios WHERE id=?', [idNum]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (rows[0].twofa_activo === 1) {
      return res.status(400).json({ error: 'El 2FA ya está activo' });
    }
    // Guardar el secreto CIFRADO en BD + marcador de activo
    await db.query('UPDATE usuarios SET twofa_secreto=?, twofa_activo=1 WHERE id=?', [
      encrypt(secreto), idNum
    ]);
    logEvento(EVENTOS.ACCION_ADMIN, req, `activó 2FA usuario id=${idNum}`);
    res.json({ message: '2FA activado correctamente' });
  } catch (err) {
    internalError(res, err, '2fa');
  }
});

// POST /api/usuarios/:id/2fa/disable — desactiva el 2FA (requiere código actual)
router.post('/:id/2fa/disable', auth(['admin']), async (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  if (idNum < 1) return res.status(400).json({ error: 'ID inválido' });

  const validado = body({
    codigo: [str, { min: 6, max: 6, required: true, label: 'código' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });

  try {
    const [rows] = await db.query(
      'SELECT twofa_secreto, twofa_activo FROM usuarios WHERE id=?', [idNum]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (rows[0].twofa_activo !== 1 || !rows[0].twofa_secreto) {
      return res.status(400).json({ error: 'El 2FA no está activo para este usuario' });
    }
    const secreto = decrypt(rows[0].twofa_secreto);
    if (!verificarTOTP(secreto, validado.values.codigo)) {
      return res.status(400).json({ error: 'El código de verificación no es válido' });
    }
    await db.query('UPDATE usuarios SET twofa_secreto=NULL, twofa_activo=0 WHERE id=?', [idNum]);
    logEvento(EVENTOS.ACCION_ADMIN, req, `desactivó 2FA usuario id=${idNum}`);
    res.json({ message: '2FA desactivado' });
  } catch (err) {
    internalError(res, err, '2fa');
  }
});

module.exports = router;