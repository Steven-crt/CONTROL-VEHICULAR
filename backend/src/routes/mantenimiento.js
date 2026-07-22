const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/mantenimiento - Listar mantenimientos con filtros
router.get('/', auth(), async (req, res) => {
  const { vehiculo_id, tipo_servicio, costo_min, costo_max, desde, hasta, limit = 50 } = req.query;
  try {
    let q = `
      SELECT m.*, v.placa, v.marca, v.modelo
      FROM mantenimiento m
      JOIN vehiculos v ON m.vehiculo_id = v.id
      WHERE 1=1
    `;
    const params = [];
    if (vehiculo_id) { q += ' AND m.vehiculo_id = ?'; params.push(vehiculo_id); }
    if (tipo_servicio) { q += ' AND m.tipo_servicio = ?'; params.push(tipo_servicio); }
    if (costo_min) { q += ' AND m.costo >= ?'; params.push(parseFloat(costo_min)); }
    if (costo_max) { q += ' AND m.costo <= ?'; params.push(parseFloat(costo_max)); }
    if (desde) { q += ' AND m.fecha >= ?'; params.push(desde); }
    if (hasta) { q += ' AND m.fecha <= ?'; params.push(hasta + ' 23:59:59'); }
    q += ' ORDER BY m.fecha DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mantenimiento/historial/:vehiculo_id - Historial completo
router.get('/historial/:vehiculo_id', auth(), async (req, res) => {
  const { tipo_servicio, costo_min, costo_max } = req.query;
  try {
    let q = `
      SELECT m.*, v.placa, v.marca, v.modelo
      FROM mantenimiento m
      JOIN vehiculos v ON m.vehiculo_id = v.id
      WHERE m.vehiculo_id = ?
    `;
    const params = [req.params.vehiculo_id];
    if (tipo_servicio) { q += ' AND m.tipo_servicio = ?'; params.push(tipo_servicio); }
    if (costo_min) { q += ' AND m.costo >= ?'; params.push(parseFloat(costo_min)); }
    if (costo_max) { q += ' AND m.costo <= ?'; params.push(parseFloat(costo_max)); }
    q += ' ORDER BY m.fecha DESC';
    
    const [rows] = await db.query(q, params);
    
    // Resumen
    const totalGasto = rows.reduce((sum, r) => sum + parseFloat(r.costo), 0);
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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mantenimiento - Registrar nuevo mantenimiento
router.post('/', auth(), async (req, res) => {
  const { vehiculo_id, fecha, tipo_servicio, descripcion, km_actual, costo, proveedor, observaciones } = req.body;
  if (!vehiculo_id || !km_actual)
    return res.status(400).json({ error: 'vehiculo_id y km_actual son requeridos' });
  
  try {
    const cleanNum = (v) => (v === '' || v === undefined || v === null) ? null : parseFloat(v);
    const cleanInt = (v) => (v === '' || v === undefined || v === null) ? null : parseInt(v);
    const [result] = await db.query(
      `INSERT INTO mantenimiento (vehiculo_id, fecha, tipo_servicio, descripcion, km_actual, costo, proveedor, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehiculo_id,
        fecha || new Date(),
        tipo_servicio || 'Preventivo',
        descripcion || '',
        cleanInt(km_actual),
        cleanNum(costo) || 0,
        proveedor || null,
        observaciones || ''
      ]
    );
    res.status(201).json({ id: result.insertId, message: 'Mantenimiento registrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
