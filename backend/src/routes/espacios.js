const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/espacios - todos los espacios con estado
router.get('/', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, z.nombre as zona_nombre, z.piso,
        t.placa, t.hora_entrada, t.codigo as ticket_codigo
      FROM espacios e
      LEFT JOIN zonas z ON e.zona_id = z.id
      LEFT JOIN tickets t ON t.espacio_id = e.id AND t.estado = 'activo'
      ORDER BY e.zona_id, e.numero
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/espacios/disponibles?tipo=auto  - espacios libres por tipo
router.get('/disponibles', auth(), async (req, res) => {
  const { tipo } = req.query;
  try {
    let q = "SELECT * FROM espacios WHERE estado='libre'";
    const params = [];
    if (tipo) { q += ' AND tipo=?'; params.push(tipo); }
    q += ' ORDER BY numero LIMIT 1';
    const [rows] = await db.query(q, params);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/espacios/stats - resumen de disponibilidad
router.get('/stats', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(estado='libre') as libres,
        SUM(estado='ocupado') as ocupados,
        SUM(estado='mantenimiento') as mantenimiento,
        tipo
      FROM espacios
      GROUP BY tipo
    `);
    const [totals] = await db.query(`
      SELECT COUNT(*) as total,
             SUM(estado='libre') as libres,
             SUM(estado='ocupado') as ocupados
      FROM espacios
    `);
    res.json({ por_tipo: rows, totales: totals[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/espacios/:id - actualizar estado
router.put('/:id', auth(['admin']), async (req, res) => {
  const { estado } = req.body;
  try {
    await db.query('UPDATE espacios SET estado=? WHERE id=?', [estado, req.params.id]);
    res.json({ message: 'Espacio actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
