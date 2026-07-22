const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/reportes/dashboard - stats para el dashboard (gestión vehicular)
router.get('/dashboard', auth(), async (req, res) => {
  try {
    const [totalVehiculos] = await db.query('SELECT COUNT(*) as total FROM vehiculos');
    const [totalClientes] = await db.query('SELECT COUNT(*) as total FROM clientes');
    const [gastosCombustible] = await db.query(
      "SELECT COALESCE(SUM(costo_total),0) as total FROM combustible WHERE MONTH(fecha_carga)=MONTH(CURDATE()) AND YEAR(fecha_carga)=YEAR(CURDATE())"
    );
    const [gastosMantenimiento] = await db.query(
      "SELECT COALESCE(SUM(costo),0) as total FROM mantenimiento WHERE MONTH(fecha)=MONTH(CURDATE()) AND YEAR(fecha)=YEAR(CURDATE())"
    );
    const [porTipo] = await db.query(
      'SELECT tipo as name, COUNT(*) as value FROM vehiculos GROUP BY tipo'
    );
    const [porMarca] = await db.query(
      'SELECT marca as name, COUNT(*) as value FROM vehiculos WHERE marca IS NOT NULL GROUP BY marca ORDER BY value DESC LIMIT 10'
    );
    const [ultimos5] = await db.query(
      `SELECT v.id, v.placa, v.tipo, v.marca, v.modelo, v.color, v.created_at,
        c.nombre as cliente_nombre
       FROM vehiculos v LEFT JOIN clientes c ON v.cliente_id = c.id
       ORDER BY v.created_at DESC LIMIT 5`
    );
    // Gastos combustible últimos 6 meses
    const [combustible6m] = await db.query(
      `SELECT DATE_FORMAT(fecha_carga,'%Y-%m') as periodo, SUM(costo_total) as total
       FROM combustible
       WHERE fecha_carga >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY periodo ORDER BY periodo`
    );
    // Gastos mantenimiento últimos 6 meses
    const [mantenimiento6m] = await db.query(
      `SELECT DATE_FORMAT(fecha,'%Y-%m') as periodo, SUM(costo) as total
       FROM mantenimiento
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY periodo ORDER BY periodo`
    );
    // Mantenimiento por tipo de servicio
    const [mantPorTipo] = await db.query(
      'SELECT tipo_servicio as name, COUNT(*) as value FROM mantenimiento GROUP BY tipo_servicio'
    );

    res.json({
      total_vehiculos: totalVehiculos[0].total,
      total_clientes: totalClientes[0].total,
      gastos_combustible_mes: parseFloat(gastosCombustible[0].total),
      gastos_mantenimiento_mes: parseFloat(gastosMantenimiento[0].total),
      vehiculos_por_tipo: porTipo,
      vehiculos_por_marca: porMarca,
      ultimos_vehiculos: ultimos5,
      combustible_por_mes: combustible6m,
      mantenimiento_por_mes: mantenimiento6m,
      mantenimiento_por_tipo: mantPorTipo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes/ingresos?desde=&hasta=&agrupar=dia|semana|mes
router.get('/ingresos', auth(), async (req, res) => {
  const { desde, hasta, agrupar = 'dia' } = req.query;
  const formatMap = { dia: '%Y-%m-%d', semana: '%Y-%u', mes: '%Y-%m' };
  const fmt = formatMap[agrupar] || '%Y-%m-%d';
  try {
    let q = `SELECT DATE_FORMAT(fecha_pago,'${fmt}') as periodo, SUM(monto) as total, COUNT(*) as transacciones FROM pagos WHERE 1=1`;
    const params = [];
    if (desde) { q += ' AND fecha_pago >= ?'; params.push(desde); }
    if (hasta) { q += ' AND fecha_pago <= ?'; params.push(hasta + ' 23:59:59'); }
    q += ` GROUP BY periodo ORDER BY periodo`;
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes/ocupacion - porcentaje de ocupación por día
router.get('/ocupacion', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DATE(hora_entrada) as fecha, COUNT(*) as vehiculos
      FROM tickets
      WHERE hora_entrada >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY fecha ORDER BY fecha
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== REPORTES DE GESTIÓN DE VEHÍCULOS ====================

// GET /api/reportes/vehiculos-resumen - Resumen general de vehículos
router.get('/vehiculos-resumen', auth(), async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) as total FROM vehiculos');
    const [porTipo] = await db.query(
      'SELECT tipo as name, COUNT(*) as value FROM vehiculos GROUP BY tipo'
    );
    const [conCliente] = await db.query(
      'SELECT COUNT(*) as total FROM vehiculos WHERE cliente_id IS NOT NULL'
    );
    const [sinCliente] = await db.query(
      'SELECT COUNT(*) as total FROM vehiculos WHERE cliente_id IS NULL'
    );
    const [porMarca] = await db.query(
      'SELECT marca as name, COUNT(*) as value FROM vehiculos WHERE marca IS NOT NULL GROUP BY marca ORDER BY value DESC LIMIT 10'
    );
    const [porAnio] = await db.query(
      'SELECT anio as name, COUNT(*) as value FROM vehiculos WHERE anio IS NOT NULL GROUP BY anio ORDER BY name DESC LIMIT 10'
    );

    res.json({
      total: total[0].total,
      por_tipo: porTipo,
      con_cliente: conCliente[0].total,
      sin_cliente: sinCliente[0].total,
      por_marca: porMarca,
      por_anio: porAnio
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes/combustible-resumen - Resumen de gastos de combustible
router.get('/combustible-resumen', auth(), async (req, res) => {
  const { desde, hasta, agrupar = 'mes' } = req.query;
  const formatMap = { dia: '%Y-%m-%d', semana: '%Y-%u', mes: '%Y-%m' };
  const fmt = formatMap[agrupar] || '%Y-%m';
  try {
    let q = `SELECT DATE_FORMAT(fecha_carga,'${fmt}') as periodo, 
             SUM(costo_total) as total, COUNT(*) as cargas,
             SUM(litros) as litros
             FROM combustible WHERE 1=1`;
    const params = [];
    if (desde) { q += ' AND fecha_carga >= ?'; params.push(desde); }
    if (hasta) { q += ' AND fecha_carga <= ?'; params.push(hasta + ' 23:59:59'); }
    q += ' GROUP BY periodo ORDER BY periodo';
    const [rows] = await db.query(q, params);

    const [totalGeneral] = await db.query(
      `SELECT COALESCE(SUM(costo_total),0) as total, COUNT(*) as cargas, COALESCE(SUM(litros),0) as litros
       FROM combustible WHERE 1=1` +
      (desde ? ' AND fecha_carga >= ?' : '') +
      (hasta ? ' AND fecha_carga <= ?' : ''),
      [desde, hasta + ' 23:59:59'].filter(Boolean)
    );

    res.json({
      por_periodo: rows.map(d => ({ ...d, total: parseFloat(d.total), litros: parseFloat(d.litros) })),
      total: parseFloat(totalGeneral[0].total),
      cargas: totalGeneral[0].cargas,
      litros: parseFloat(totalGeneral[0].litros)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes/mantenimiento-resumen - Resumen de gastos de mantenimiento
router.get('/mantenimiento-resumen', auth(), async (req, res) => {
  const { desde, hasta, agrupar = 'mes' } = req.query;
  const formatMap = { dia: '%Y-%m-%d', semana: '%Y-%u', mes: '%Y-%m' };
  const fmt = formatMap[agrupar] || '%Y-%m';
  try {
    let q = `SELECT DATE_FORMAT(fecha,'${fmt}') as periodo, 
             SUM(costo) as total, COUNT(*) as servicios
             FROM mantenimiento WHERE 1=1`;
    const params = [];
    if (desde) { q += ' AND fecha >= ?'; params.push(desde); }
    if (hasta) { q += ' AND fecha <= ?'; params.push(hasta + ' 23:59:59'); }
    q += ' GROUP BY periodo ORDER BY periodo';
    const [rows] = await db.query(q, params);

    const [totalGeneral] = await db.query(
      `SELECT COALESCE(SUM(costo),0) as total, COUNT(*) as servicios
       FROM mantenimiento WHERE 1=1` +
      (desde ? ' AND fecha >= ?' : '') +
      (hasta ? ' AND fecha <= ?' : ''),
      [desde, hasta + ' 23:59:59'].filter(Boolean)
    );

    const [porTipo] = await db.query(
      `SELECT tipo_servicio as name, COUNT(*) as value, SUM(costo) as total
       FROM mantenimiento WHERE 1=1` +
      (desde ? ' AND fecha >= ?' : '') +
      (hasta ? ' AND fecha <= ?' : ''),
      [desde, hasta + ' 23:59:59'].filter(Boolean)
    );

    res.json({
      por_periodo: rows.map(d => ({ ...d, total: parseFloat(d.total) })),
      total: parseFloat(totalGeneral[0].total),
      servicios: totalGeneral[0].servicios,
      por_tipo: porTipo.map(d => ({ ...d, total: parseFloat(d.total) }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes/gastos-consolidado - Gastos consolidados (combustible + mantenimiento)
router.get('/gastos-consolidado', auth(), async (req, res) => {
  const { desde, hasta, agrupar = 'mes' } = req.query;
  const formatMap = { dia: '%Y-%m-%d', semana: '%Y-%u', mes: '%Y-%m' };
  const fmt = formatMap[agrupar] || '%Y-%m';
  try {
    let qCombustible = `SELECT DATE_FORMAT(fecha_carga,'${fmt}') as periodo, 
                        SUM(costo_total) as total FROM combustible WHERE 1=1`;
    let qMantenimiento = `SELECT DATE_FORMAT(fecha,'${fmt}') as periodo, 
                          SUM(costo) as total FROM mantenimiento WHERE 1=1`;
    const paramsC = [], paramsM = [];
    if (desde) { qCombustible += ' AND fecha_carga >= ?'; paramsC.push(desde); qMantenimiento += ' AND fecha >= ?'; paramsM.push(desde); }
    if (hasta) { qCombustible += ' AND fecha_carga <= ?'; paramsC.push(hasta + ' 23:59:59'); qMantenimiento += ' AND fecha <= ?'; paramsM.push(hasta + ' 23:59:59'); }
    qCombustible += ' GROUP BY periodo ORDER BY periodo';
    qMantenimiento += ' GROUP BY periodo ORDER BY periodo';

    const [comb] = await db.query(qCombustible, paramsC);
    const [mant] = await db.query(qMantenimiento, paramsM);

    // Consolidar por período
    const mapa = {};
    comb.forEach(d => { mapa[d.periodo] = { combustible: parseFloat(d.total), mantenimiento: 0 }; });
    mant.forEach(d => { 
      if (!mapa[d.periodo]) mapa[d.periodo] = { combustible: 0, mantenimiento: 0 };
      mapa[d.periodo].mantenimiento = parseFloat(d.total); 
    });

    const consolidado = Object.entries(mapa)
      .map(([periodo, val]) => ({ periodo, ...val, total: val.combustible + val.mantenimiento }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    res.json(consolidado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes/vehiculos-recientes - Últimos vehículos registrados
router.get('/vehiculos-recientes', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.id, v.placa, v.tipo, v.marca, v.modelo, v.color, v.created_at,
        c.nombre as cliente_nombre
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ORDER BY v.created_at DESC LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
