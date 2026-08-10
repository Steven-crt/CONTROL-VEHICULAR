const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const CARGA_SELECT = `
  SELECT c.id, c.codigo, c.vehiculo_id, v.placa, v.marca, v.modelo,
    c.galones_solicitados AS litros_solicitados,
    c.galones_surtidos AS litros,
    c.precio_por_galon AS precio_unitario,
    c.costo_total,
    c.kilometraje_actual AS km_actual,
    c.tipo_combustible, c.estado,
    c.fecha_solicitud AS fecha_carga,
    c.fecha_atencion, c.solicitante_id, c.atendido_por_id, c.observaciones,
    (SELECT kilometraje_actual FROM solicitudes_combustible c2
       WHERE c2.vehiculo_id = c.vehiculo_id AND c2.fecha_solicitud < c.fecha_solicitud
       ORDER BY c2.fecha_solicitud DESC LIMIT 1) AS km_anterior
  FROM solicitudes_combustible c
  JOIN vehiculos v ON c.vehiculo_id = v.id
`;

function genCodigo(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function actualizarKmVehiculo(vehiculo_id, km) {
  if (!km || isNaN(km)) return;
  await db.query(
    'UPDATE vehiculos SET kilometraje_actual = ? WHERE id = ? AND kilometraje_actual < ?',
    [parseFloat(km), vehiculo_id, parseFloat(km)]
  );
}

// GET /api/combustible - Listar cargas de combustible con filtros
router.get('/', auth(), async (req, res) => {
  const { vehiculo_id, tipo_combustible, desde, hasta, limit = 50 } = req.query;
  try {
    let q = `${CARGA_SELECT} WHERE 1=1`;
    const params = [];
    if (vehiculo_id) { q += ' AND c.vehiculo_id = ?'; params.push(vehiculo_id); }
    if (tipo_combustible) { q += ' AND c.tipo_combustible = ?'; params.push(tipo_combustible); }
    if (desde) { q += ' AND c.fecha_solicitud >= ?'; params.push(desde); }
    if (hasta) { q += ' AND c.fecha_solicitud <= ?'; params.push(hasta + ' 23:59:59'); }
    q += ' ORDER BY c.fecha_solicitud DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await db.query(q, params);

    const enriched = rows.map((r, i) => {
      const kmAnterior = r.km_anterior || 0;
      const kmRecorridos = r.km_actual - kmAnterior;
      const rendimiento = r.litros > 0 && kmRecorridos > 0
        ? (kmRecorridos / r.litros).toFixed(2)
        : null;

      let diasEntreCargas = null;
      if (i < rows.length - 1) {
        const fechaActual = new Date(r.fecha_carga);
        const fechaAnterior = new Date(rows[i + 1].fecha_carga);
        diasEntreCargas = Math.round((fechaActual - fechaAnterior) / (1000 * 60 * 60 * 24));
      }

      return {
        ...r,
        km_anterior: kmAnterior || null,
        km_recorridos: kmRecorridos > 0 ? kmRecorridos : null,
        rendimiento_estimado: rendimiento ? parseFloat(rendimiento) : null,
        dias_entre_cargas: diasEntreCargas
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/combustible/historial/:vehiculo_id - Historial completo con rendimiento
router.get('/historial/:vehiculo_id', auth(), async (req, res) => {
  const { tipo_combustible } = req.query;
  try {
    let q = `${CARGA_SELECT} WHERE c.vehiculo_id = ?`;
    const params = [req.params.vehiculo_id];
    if (tipo_combustible) { q += ' AND c.tipo_combustible = ?'; params.push(tipo_combustible); }
    q += ' ORDER BY c.fecha_solicitud DESC';

    const [rows] = await db.query(q, params);

    const enriched = rows.map((r, i) => {
      const cargaAnterior = rows[i + 1];
      const kmAnterior = cargaAnterior ? cargaAnterior.km_actual : null;
      const kmRecorridos = kmAnterior !== null ? r.km_actual - kmAnterior : null;
      const rendimiento = r.litros > 0 && kmRecorridos && kmRecorridos > 0
        ? parseFloat((kmRecorridos / r.litros).toFixed(2))
        : null;

      let diasEntreCargas = null;
      if (cargaAnterior) {
        diasEntreCargas = Math.round(
          (new Date(r.fecha_carga) - new Date(cargaAnterior.fecha_carga)) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        ...r,
        km_anterior: kmAnterior,
        km_recorridos: kmRecorridos,
        rendimiento_estimado: rendimiento,
        dias_entre_cargas: diasEntreCargas
      };
    });

    const kmRecorridosTotal = rows.length > 1
      ? rows[0].km_actual - rows[rows.length - 1].km_actual
      : 0;
    const litrosTotal = rows.reduce((sum, r) => sum + parseFloat(r.litros || 0), 0);
    const gastoTotal = rows.reduce((sum, r) => sum + parseFloat(r.costo_total || 0), 0);
    const consumoPromedio = litrosTotal > 0 && kmRecorridosTotal > 0
      ? parseFloat(((litrosTotal / kmRecorridosTotal) * 100).toFixed(2))
      : null;

    res.json({
      historial: enriched,
      resumen: {
        total_cargas: rows.length,
        total_litros: parseFloat(litrosTotal.toFixed(2)),
        total_gasto: parseFloat(gastoTotal.toFixed(2)),
        km_recorridos_total: kmRecorridosTotal,
        consumo_promedio_l100km: consumoPromedio
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/combustible - Registrar nueva carga de combustible
router.post('/', auth(), async (req, res) => {
  const { vehiculo_id, litros, precio_unitario, costo_total, km_actual, tipo_combustible, ubicacion_gps, observaciones } = req.body;
  if (!vehiculo_id || !litros || !km_actual)
    return res.status(400).json({ error: 'vehiculo_id, litros y km_actual son requeridos' });

  try {
    const cleanNum = (v) => (v === '' || v === undefined || v === null) ? null : parseFloat(v);
    const costo = costo_total || (litros * (precio_unitario || 0));
    const [result] = await db.query(
      `INSERT INTO solicitudes_combustible
        (codigo, vehiculo_id, solicitante_id, galones_solicitados, galones_surtidos, precio_por_galon, costo_total, kilometraje_actual, tipo_combustible, estado, fecha_solicitud, fecha_atencion, atendido_por_id, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Surtida', NOW(), NOW(), ?, ?)`,
      [
        genCodigo('SC'),
        vehiculo_id,
        req.user?.id || 1,
        litros,
        litros,
        cleanNum(precio_unitario) || 0,
        cleanNum(costo_total) || cleanNum(costo) || 0,
        km_actual,
        tipo_combustible || 'Gasolina',
        req.user?.id || null,
        observaciones || ''
      ]
    );

    if (ubicacion_gps) {
      await db.query(
        'INSERT INTO ubicaciones (vehiculo_id, usuario_id, latitud, longitud, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [vehiculo_id, req.user?.id || null, ubicacion_gps.latitud, ubicacion_gps.longitud]
      );
    }

    await actualizarKmVehiculo(vehiculo_id, km_actual);
    res.status(201).json({ id: result.insertId, message: 'Carga de combustible registrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/combustible/tipos - Obtener tipos de combustible disponibles
router.get('/tipos', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DISTINCT tipo_combustible FROM solicitudes_combustible WHERE tipo_combustible IS NOT NULL ORDER BY tipo_combustible"
    );
    res.json(rows.map(r => r.tipo_combustible));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
