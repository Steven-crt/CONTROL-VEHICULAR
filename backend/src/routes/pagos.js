const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// POST /api/pagos - registrar pago
router.post('/', auth(), async (req, res) => {
  const { ticket_id, monto, metodo_pago, monto_recibido, referencia } = req.body;
  if (!ticket_id || !monto || !metodo_pago)
    return res.status(400).json({ error: 'ticket_id, monto y metodo_pago son requeridos' });
  try {
    const cambio = metodo_pago === 'efectivo' ? Math.max(0, (monto_recibido || monto) - monto) : 0;
    const [result] = await db.query(
      'INSERT INTO pagos (ticket_id, usuario_id, monto, metodo_pago, monto_recibido, cambio, referencia) VALUES (?,?,?,?,?,?,?)',
      [ticket_id, req.user.id, monto, metodo_pago, monto_recibido || monto, cambio, referencia || '']
    );
    res.status(201).json({ id: result.insertId, cambio, message: 'Pago registrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pagos/historial
router.get('/historial', auth(), async (req, res) => {
  const { fecha_desde, fecha_hasta, usuario_id } = req.query;
  try {
    let q = `
      SELECT p.*, t.placa, t.codigo as ticket_codigo, u.nombre as cajero
      FROM pagos p
      LEFT JOIN tickets t ON p.ticket_id = t.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (fecha_desde) { q += ' AND DATE(p.fecha_pago) >= ?'; params.push(fecha_desde); }
    if (fecha_hasta) { q += ' AND DATE(p.fecha_pago) <= ?'; params.push(fecha_hasta); }
    if (usuario_id) { q += ' AND p.usuario_id = ?'; params.push(usuario_id); }
    q += ' ORDER BY p.fecha_pago DESC LIMIT 200';
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pagos/cierre-caja
router.post('/cierre-caja', auth(['admin', 'cajero']), async (req, res) => {
  const { fecha_inicio, observaciones } = req.body;
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) as total_vehiculos,
        SUM(CASE WHEN metodo_pago='efectivo' THEN monto ELSE 0 END) as total_efectivo,
        SUM(CASE WHEN metodo_pago='tarjeta' THEN monto ELSE 0 END) as total_tarjeta,
        SUM(CASE WHEN metodo_pago='QR' THEN monto ELSE 0 END) as total_qr,
        SUM(monto) as total_general
      FROM pagos
      WHERE fecha_pago >= ?
    `, [fecha_inicio || new Date().toISOString().slice(0,10)]);

    const totales = rows[0];
    const [result] = await db.query(
      'INSERT INTO cierres_caja (usuario_id, fecha_inicio, total_vehiculos, total_efectivo, total_tarjeta, total_qr, total_general, observaciones) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, fecha_inicio, totales.total_vehiculos, totales.total_efectivo, totales.total_tarjeta, totales.total_qr, totales.total_general, observaciones || '']
    );
    res.json({ id: result.insertId, ...totales, message: 'Cierre de caja registrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pagos/cierres
router.get('/cierres', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.nombre as cajero
      FROM cierres_caja c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.fecha_cierre DESC LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
