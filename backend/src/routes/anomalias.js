/**
 * Módulo de anomalías: reportes de daños/fallas por vehículo.
 *
 * Permisos:
 * - Cualquier usuario autenticado puede REPORTAR anomalías (POST /).
 * - Un empleado solo ve SUS reportes; el admin ve todos (GET /).
 * - Cambiar estado (atender/resolver) y eliminar es exclusivo del admin.
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');
const { str, intId, body } = require('../utils/validate');
const { EVENTOS, logEvento } = require('../utils/audit');

const LIMIT_MAX = 200;
const TIPOS_VALIDOS = ['Mecánica', 'Eléctrica', 'Llantas', 'Frenos', 'Carrocería', 'Fuga', 'Otro'];
const SEVERIDADES_VALIDAS = ['baja', 'media', 'alta'];
const ESTADOS_VALIDOS = ['Pendiente', 'En revisión', 'Resuelta', 'Descartada'];

function parseLimit(valor) {
  const n = parseInt(valor, 10);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(n, LIMIT_MAX);
}

const ANOMALIA_SELECT = `
  SELECT a.id, a.codigo, a.vehiculo_id, v.placa, v.marca, v.modelo,
    a.usuario_id, u.nombre AS reportado_por,
    a.tipo, a.severidad, a.descripcion, a.foto_url, a.estado,
    a.fecha_resuelta, r.nombre AS resuelta_por,
    a.created_at, a.updated_at
  FROM anomalias a
  JOIN vehiculos v ON a.vehiculo_id = v.id
  LEFT JOIN usuarios u ON a.usuario_id = u.id
  LEFT JOIN usuarios r ON a.resuelta_por_id = r.id
`;

function genCodigo() {
  return 'AN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// GET /api/anomalias - Listar anomalías
// ?estado=  ?severidad=  ?vehiculo_id=  ?solo_mias=1
router.get('/', auth(), async (req, res) => {
  const limit = parseLimit(req.query.limit);
  try {
    let q = `${ANOMALIA_SELECT} WHERE 1=1`;
    const params = [];
    if (req.query.estado && ESTADOS_VALIDOS.includes(String(req.query.estado))) {
      q += ' AND a.estado = ?';
      params.push(String(req.query.estado));
    }
    if (req.query.severidad && SEVERIDADES_VALIDAS.includes(String(req.query.severidad))) {
      q += ' AND a.severidad = ?';
      params.push(String(req.query.severidad));
    }
    const idVehiculo = intId(req.query.vehiculo_id, { label: 'vehiculo_id' }).value;
    if (idVehiculo !== null) { q += ' AND a.vehiculo_id = ?'; params.push(idVehiculo); }
    // Empleados solo ven sus propios reportes; el admin ve todo.
    if (req.user?.rol !== 'admin') {
      q += ' AND a.usuario_id = ?';
      params.push(req.user.id);
    } else if (String(req.query.solo_mias || '') === '1') {
      q += ' AND a.usuario_id = ?';
      params.push(req.user.id);
    }
    q += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    internalError(res, err, 'anomalias');
  }
});

// POST /api/anomalias - Reportar una anomalía (cualquier usuario autenticado)
router.post('/', auth(), async (req, res) => {
  const validado = body({
    vehiculo_id: [intId, { label: 'vehiculo_id' }],
    tipo: [str, { max: 50, label: 'tipo' }],
    severidad: [str, { max: 10, label: 'severidad' }],
    descripcion: [str, { max: 1000, required: true, label: 'descripción' }],
    foto_url: [str, { max: 255, label: 'foto_url' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });
  const { vehiculo_id, tipo, severidad, descripcion, foto_url } = validado.values;

  try {
    const tipoFinal = tipo && TIPOS_VALIDOS.includes(tipo) ? tipo : 'Otro';
    const severidadFinal = severidad && SEVERIDADES_VALIDAS.includes(severidad.toLowerCase()) ? severidad.toLowerCase() : 'media';

    // El vehículo debe existir antes de insertar (la FK lo exige igualmente)
    const [veh] = await db.query('SELECT id FROM vehiculos WHERE id = ?', [vehiculo_id]);
    if (veh.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });

    const codigo = genCodigo();
    const [result] = await db.query(
      `INSERT INTO anomalias (codigo, vehiculo_id, usuario_id, tipo, severidad, descripcion, foto_url, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')`,
      [codigo, vehiculo_id, req.user?.id || null, tipoFinal, severidadFinal, descripcion, foto_url || null]
    );

    logEvento(EVENTOS.ACCION_ADMIN, req, `anomalía ${codigo} reportada por usuario id=${req.user?.id}`);
    res.status(201).json({
      id: result.insertId,
      codigo,
      message: 'Anomalía reportada correctamente',
      estado: 'Pendiente'
    });
  } catch (err) {
    internalError(res, err, 'anomalias');
  }
});

// PUT /api/anomalias/:id/estado - Cambiar estado (solo admin)
// Body: { estado: 'Pendiente'|'En revisión'|'Resuelta'|'Descartada' }
router.put('/:id/estado', auth(['admin']), async (req, res) => {
  const id = intId(req.params.id, { label: 'id' }).value;
  const nuevoEstado = String(req.body?.estado || '');
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${ESTADOS_VALIDOS.join(', ')}` });
  }
  try {
    const fechaResuelta = (nuevoEstado === 'Resuelta' || nuevoEstado === 'Descartada') ? new Date() : null;
    const [result] = await db.query(
      `UPDATE anomalias SET estado = ?, fecha_resuelta = ?, resuelta_por_id = ? WHERE id = ?`,
      [nuevoEstado, fechaResuelta, req.user.id, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Anomalía no encontrada' });

    logEvento(EVENTOS.ACCION_ADMIN, req, `anomalía id=${id} -> ${nuevoEstado}`);
    res.json({ message: `Anomalía actualizada a "${nuevoEstado}"`, estado: nuevoEstado });
  } catch (err) {
    internalError(res, err, 'anomalias');
  }
});

// DELETE /api/anomalias/:id - Eliminar una anomalía (solo admin)
router.delete('/:id', auth(['admin']), async (req, res) => {
  const id = intId(req.params.id, { label: 'id' }).value;
  try {
    const [result] = await db.query('DELETE FROM anomalias WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Anomalía no encontrada' });

    logEvento(EVENTOS.ACCION_ADMIN, req, `eliminó anomalía id=${id}`);
    res.json({ message: 'Anomalía eliminada' });
  } catch (err) {
    internalError(res, err, 'anomalias');
  }
});

module.exports = router;
