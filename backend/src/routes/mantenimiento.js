const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');
const { str, num, date, intId, body } = require('../utils/validate');
const { EVENTOS, logEvento } = require('../utils/audit');
const { EVENTOS: RT, emitirCambio } = require('../realtime');

const LIMIT_MAX = 200;

function parseLimit(valor) {
  const n = parseInt(valor, 10);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(n, LIMIT_MAX);
}

const TIPOS_SERVICIO_VALIDOS = ['Preventivo', 'Correctivo'];

const MANT_SELECT = `
  SELECT m.id, m.codigo, m.vehiculo_id, v.placa, v.marca, v.modelo,
    m.tipo_mantenimiento_id,
    m.tipo_servicio,
    m.descripcion,
    m.kilometraje_programado AS km_programado,
    m.kilometraje_realizado AS km_actual,
    m.fecha_programada,
    m.fecha_realizada AS fecha,
    m.costo, m.proveedor, m.factura, m.estado, m.observaciones,
    m.solicitante_id, m.created_at, m.updated_at,
    sol.nombre AS solicitante_nombre
  FROM mantenimientos m
  JOIN vehiculos v ON m.vehiculo_id = v.id
  LEFT JOIN usuarios sol ON sol.id = m.solicitante_id
`;

function genCodigo(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function tipoMantenimientoId(tipoServicio) {
  const esPreventivo = (tipoServicio || 'Preventivo') !== 'Correctivo';
  const [rows] = await db.query(
    `SELECT id FROM tipos_mantenimiento WHERE cada_km ${esPreventivo ? 'IS NOT NULL' : 'IS NULL'} ORDER BY id LIMIT 1`
  );
  return rows.length ? rows[0].id : 1;
}

async function actualizarKmVehiculo(vehiculo_id, km) {
  if (!km || isNaN(km)) return;
  await db.query(
    'UPDATE vehiculos SET kilometraje_actual = ? WHERE id = ? AND kilometraje_actual < ?',
    [parseFloat(km), vehiculo_id, parseFloat(km)]
  );
}

// GET /api/mantenimiento - Listar mantenimientos con filtros
// ?estado=Pendiente|Completado|Rechazado  filtra por estado
// ?solo_mios=1                            solo lo solicitado por el usuario actual
router.get('/', auth(), async (req, res) => {
  const { vehiculo_id, tipo_servicio, costo_min, costo_max, desde, hasta } = req.query;
  const limit = parseLimit(req.query.limit);
  try {
    let q = `${MANT_SELECT} WHERE 1=1`;
    const params = [];
    const idVehiculo = num(vehiculo_id, { min: 1, max: 2147483647, label: 'vehiculo_id' }).value;
    if (idVehiculo !== null) { q += ' AND m.vehiculo_id = ?'; params.push(idVehiculo); }
    if (tipo_servicio && TIPOS_SERVICIO_VALIDOS.includes(String(tipo_servicio))) {
      q += ' AND m.tipo_servicio = ?';
      params.push(tipo_servicio);
    }
    if (req.query.estado && ['Pendiente', 'Completado', 'Rechazado'].includes(String(req.query.estado))) {
      q += ' AND m.estado = ?';
      params.push(String(req.query.estado));
    }
    if (req.user?.rol !== 'admin' || String(req.query.solo_mios || '') === '1') {
      q += ' AND m.solicitante_id = ?';
      params.push(req.user.id);
    }
    const min = num(costo_min, { min: 0, max: 1000000000, label: 'costo_min' }).value;
    if (min !== null) { q += ' AND m.costo >= ?'; params.push(min); }
    const max = num(costo_max, { min: 0, max: 1000000000, label: 'costo_max' }).value;
    if (max !== null) { q += ' AND m.costo <= ?'; params.push(max); }
    const desdeVal = date(desde, { label: 'desde' }).value;
    if (desdeVal) { q += ' AND m.fecha_realizada >= ?'; params.push(desdeVal); }
    const hastaVal = date(hasta, { label: 'hasta' }).value;
    if (hastaVal) { q += ' AND m.fecha_realizada <= ?'; params.push(hastaVal + ' 23:59:59'); }
    q += ' ORDER BY m.fecha_realizada DESC LIMIT ?';
    params.push(limit);

    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    internalError(res, err, 'mantenimiento');
  }
});

// GET /api/mantenimiento/historial/:vehiculo_id - Historial completo
router.get('/historial/:vehiculo_id', auth(), async (req, res) => {
  const vehiculoId = intId(req.params.vehiculo_id, { label: 'vehiculo_id' }).value;
  const { tipo_servicio, costo_min, costo_max } = req.query;
  const limit = parseLimit(req.query.limit);
  try {
    let q = `${MANT_SELECT} WHERE m.vehiculo_id = ?`;
    const params = [vehiculoId];
    if (tipo_servicio && TIPOS_SERVICIO_VALIDOS.includes(String(tipo_servicio))) {
      q += ' AND m.tipo_servicio = ?';
      params.push(tipo_servicio);
    }
    const min = num(costo_min, { min: 0, max: 1000000000, label: 'costo_min' }).value;
    if (min !== null) { q += ' AND m.costo >= ?'; params.push(min); }
    const max = num(costo_max, { min: 0, max: 1000000000, label: 'costo_max' }).value;
    if (max !== null) { q += ' AND m.costo <= ?'; params.push(max); }
    q += ' ORDER BY m.fecha_realizada DESC LIMIT ?';
    params.push(limit);

    const [rows] = await db.query(q, params);

    const totalGasto = rows.reduce((sum, r) => sum + parseFloat(r.costo || 0), 0);
    const preventivos = rows.filter(r => r.tipo_servicio === 'Preventivo').length;
    const correctivos = rows.filter(r => r.tipo_servicio === 'Correctivo').length;

    res.json({
      historial: rows,
      resumen: {
        total: rows.length,
        total_gasto: parseFloat(totalGasto.toFixed(2)),
        preventivos,
        correctivos
      }
    });
  } catch (err) {
    internalError(res, err, 'mantenimiento');
  }
});


router.post('/', auth(), async (req, res) => {
  const validado = body({
    vehiculo_id: [intId, { label: 'vehiculo_id' }],
    fecha: [date, { label: 'fecha' }],
    tipo_servicio: [str, { max: 20, label: 'tipo de servicio' }],
    descripcion: [str, { max: 500, label: 'descripción' }],
    km_actual: [num, { min: 0, max: 9999999, required: true, label: 'km actual' }],
    costo: [num, { min: 0, max: 1000000000, label: 'costo' }],
    proveedor: [str, { max: 100, label: 'proveedor' }],
    observaciones: [str, { max: 500, label: 'observaciones' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });

  const { vehiculo_id, fecha, tipo_servicio, descripcion, km_actual, costo, proveedor, observaciones } = validado.values;

  try {
    const esAdmin = req.user?.rol === 'admin';
    const esPendiente = !esAdmin;
    const tipoServicio = tipo_servicio && TIPOS_SERVICIO_VALIDOS.includes(tipo_servicio) ? tipo_servicio : 'Preventivo';
    const tipoId = await tipoMantenimientoId(tipoServicio);

    
    const fechaRegistro = esPendiente ? new Date().toISOString().slice(0, 10) : (fecha || new Date().toISOString().slice(0, 10));

    const [result] = await db.query(
      `INSERT INTO mantenimientos
        (codigo, vehiculo_id, solicitante_id, tipo_mantenimiento_id, tipo_servicio, descripcion, kilometraje_realizado, fecha_realizada, costo, proveedor, observaciones, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        genCodigo('MT'),
        vehiculo_id,
        req.user?.id || null,
        tipoId,
        tipoServicio,
        descripcion || '',
        km_actual,
        fechaRegistro,
        esPendiente ? 0 : (costo || 0),
        esPendiente ? null : (proveedor || null),
        observaciones || '',
        esPendiente ? 'Pendiente' : 'Completado'
      ]
    );

    // El kilometraje del vehículo solo se actualiza al completar el servicio.
    if (!esPendiente) {
      await actualizarKmVehiculo(vehiculo_id, km_actual);
      emitirCambio(RT.MANTENIMIENTO, { accion: 'nuevo', id: result.insertId, vehiculo_id });
      res.status(201).json({ id: result.insertId, message: 'Mantenimiento registrado', estado: 'Completado' });
    } else {
      emitirCambio(RT.MANTENIMIENTO, { accion: 'nuevo', id: result.insertId, vehiculo_id });
      res.status(201).json({
        id: result.insertId,
        message: 'Solicitud de mantenimiento creada. Queda pendiente de aprobación.',
        estado: 'Pendiente'
      });
    }
  } catch (err) {
    internalError(res, err, 'mantenimiento');
  }
});

// PUT /api/mantenimiento/:id/atender - Completar una solicitud pendiente (admin)
// Opcionalmente acepta costo / proveedor / fecha para ajustar al momento de aprobar.
router.put('/:id/atender', auth(['admin']), async (req, res) => {
  const id = intId(req.params.id, { label: 'id' }).value;
  const costo = num(req.body?.costo, { min: 0, max: 1000000000, label: 'costo' });
  const proveedor = str(req.body?.proveedor, { max: 100, label: 'proveedor' });
  const fecha = date(req.body?.fecha, { label: 'fecha' });
  if (costo.ok === false) return res.status(400).json({ error: costo.error });
  if (proveedor.ok === false) return res.status(400).json({ error: proveedor.error });
  if (fecha.ok === false) return res.status(400).json({ error: fecha.error });

  try {
    const [rows] = await db.query(
      "SELECT * FROM mantenimientos WHERE id = ? AND estado = 'Pendiente'",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Solicitud no encontrada o ya atendida' });

    const sol = rows[0];
    await db.query(
      `UPDATE mantenimientos
      SET estado = 'Completado', costo = ?, proveedor = ?, fecha_realizada = ?
      WHERE id = ?`,
      [
        costo.value ?? sol.costo ?? 0,
        proveedor.value ?? sol.proveedor ?? null,
        fecha.value ?? new Date().toISOString().slice(0, 10),
        id
      ]
    );

    await actualizarKmVehiculo(sol.vehiculo_id, sol.kilometraje_realizado);
    logEvento(EVENTOS.ACCION_ADMIN, req, `aprobó solicitud mantenimiento id=${id}`);
    emitirCambio(RT.MANTENIMIENTO, { accion: 'completado', id, vehiculo_id: sol.vehiculo_id });
    res.json({ message: 'Mantenimiento completado', estado: 'Completado' });
  } catch (err) {
    internalError(res, err, 'mantenimiento');
  }
});

router.put('/:id/rechazar', auth(['admin']), async (req, res) => {
  const id = intId(req.params.id, { label: 'id' }).value;
  try {
    const [result] = await db.query(
      "UPDATE mantenimientos SET estado = 'Rechazado' WHERE id = ? AND estado = 'Pendiente'",
      [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Solicitud no encontrada o ya atendida' });

    logEvento(EVENTOS.ACCION_ADMIN, req, `rechazó solicitud mantenimiento id=${id}`);
    emitirCambio(RT.MANTENIMIENTO, { accion: 'rechazado', id, vehiculo_id: null });
    res.json({ message: 'Solicitud rechazada', estado: 'Rechazado' });
  } catch (err) {
    internalError(res, err, 'mantenimiento');
  }
});

module.exports = router;
