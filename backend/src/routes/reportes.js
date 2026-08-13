const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');

const INICIO_MES = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";

// GET /api/reportes/dashboard - stats para el dashboard (gestión vehicular)
router.get('/dashboard', auth(), async (req, res) => {
  try {
    const [totalVehiculos] = await db.query('SELECT COUNT(*) as total FROM vehiculos WHERE activo = 1');
    const [gastosCombustible] = await db.query(
      `SELECT COALESCE(SUM(costo_total),0) as total FROM solicitudes_combustible
       WHERE fecha_solicitud >= ${INICIO_MES} AND fecha_solicitud < DATE_ADD(${INICIO_MES}, INTERVAL 1 MONTH)`
    );
    const [gastosMantenimiento] = await db.query(
      `SELECT COALESCE(SUM(costo),0) as total FROM mantenimientos
       WHERE fecha_realizada >= ${INICIO_MES} AND fecha_realizada < DATE_ADD(${INICIO_MES}, INTERVAL 1 MONTH)`
    );
    const [porTipo] = await db.query(
      `SELECT LOWER(COALESCE(tv.nombre, 'Otro')) as name, COUNT(*) as value
       FROM vehiculos v
       LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
       WHERE v.activo = 1
       GROUP BY tv.nombre`
    );
    const [porMarca] = await db.query(
      `SELECT marca as name, COUNT(*) as value FROM vehiculos
       WHERE marca IS NOT NULL AND activo = 1 GROUP BY marca ORDER BY value DESC LIMIT 10`
    );
    const [ultimos5] = await db.query(
      `SELECT v.id, v.placa, LOWER(COALESCE(tv.nombre, 'camioneta')) as tipo, v.marca, v.modelo, v.color, v.created_at
       FROM vehiculos v
       LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
       WHERE v.activo = 1
       ORDER BY v.created_at DESC LIMIT 5`
    );
    // Gastos combustible últimos 6 meses
    const [combustible6m] = await db.query(
      `SELECT DATE_FORMAT(fecha_solicitud,'%Y-%m') as periodo, SUM(costo_total) as total
       FROM solicitudes_combustible
       WHERE fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY periodo ORDER BY periodo`
    );
    // Gastos mantenimiento últimos 6 meses
    const [mantenimiento6m] = await db.query(
      `SELECT DATE_FORMAT(fecha_realizada,'%Y-%m') as periodo, SUM(costo) as total
       FROM mantenimientos
       WHERE fecha_realizada >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY periodo ORDER BY periodo`
    );
    // Mantenimiento por tipo de servicio
    const [mantPorTipo] = await db.query(
      'SELECT tipo_servicio as name, COUNT(*) as value FROM mantenimientos GROUP BY tipo_servicio'
    );

    res.json({
      total_vehiculos: totalVehiculos[0].total,
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
    internalError(res, err, 'reportes/dashboard');
  }
});

// ==================== REPORTES DE GESTIÓN DE VEHÍCULOS ====================

// GET /api/reportes/vehiculos-resumen - Resumen general de vehículos
router.get('/vehiculos-resumen', auth(), async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) as total FROM vehiculos WHERE activo = 1');
    const [porTipo] = await db.query(
      `SELECT LOWER(COALESCE(tv.nombre, 'Otro')) as name, COUNT(*) as value
       FROM vehiculos v
       LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
       WHERE v.activo = 1
       GROUP BY tv.nombre`
    );
    const [porMarca] = await db.query(
      `SELECT marca as name, COUNT(*) as value FROM vehiculos
       WHERE marca IS NOT NULL AND activo = 1 GROUP BY marca ORDER BY value DESC LIMIT 10`
    );
    const [porAnio] = await db.query(
      `SELECT ano as name, COUNT(*) as value FROM vehiculos
       WHERE ano IS NOT NULL AND activo = 1 GROUP BY ano ORDER BY name DESC LIMIT 10`
    );

    res.json({
      total: total[0].total,
      por_tipo: porTipo,
      por_marca: porMarca,
      por_anio: porAnio
    });
  } catch (err) {
    internalError(res, err, 'reportes/dashboard');
  }
});

// GET /api/reportes/combustible-resumen - Resumen de gastos de combustible
router.get('/combustible-resumen', auth(), async (req, res) => {
  const { desde, hasta, agrupar = 'mes' } = req.query;
  const formatMap = { dia: '%Y-%m-%d', semana: '%Y-%u', mes: '%Y-%m' };
  const fmt = formatMap[agrupar] || '%Y-%m';
  try {
    let q = `SELECT DATE_FORMAT(fecha_solicitud,'${fmt}') as periodo,
             SUM(costo_total) as total, COUNT(*) as cargas,
             SUM(galones_surtidos) as litros
             FROM solicitudes_combustible WHERE 1=1`;
    const params = [];
    if (desde) { q += ' AND fecha_solicitud >= ?'; params.push(desde); }
    if (hasta) { q += ' AND fecha_solicitud <= ?'; params.push(hasta + ' 23:59:59'); }
    q += ' GROUP BY periodo ORDER BY periodo';
    const [rows] = await db.query(q, params);

    const [totalGeneral] = await db.query(
      `SELECT COALESCE(SUM(costo_total),0) as total, COUNT(*) as cargas, COALESCE(SUM(galones_surtidos),0) as litros
       FROM solicitudes_combustible WHERE 1=1` +
      (desde ? ' AND fecha_solicitud >= ?' : '') +
      (hasta ? ' AND fecha_solicitud <= ?' : ''),
      [desde, hasta + ' 23:59:59'].filter(Boolean)
    );

    res.json({
      por_periodo: rows.map(d => ({ ...d, total: parseFloat(d.total), litros: parseFloat(d.litros) })),
      total: parseFloat(totalGeneral[0].total),
      cargas: totalGeneral[0].cargas,
      litros: parseFloat(totalGeneral[0].litros)
    });
  } catch (err) {
    internalError(res, err, 'reportes/dashboard');
  }
});

// GET /api/reportes/mantenimiento-resumen - Resumen de gastos de mantenimiento
router.get('/mantenimiento-resumen', auth(), async (req, res) => {
  const { desde, hasta, agrupar = 'mes' } = req.query;
  const formatMap = { dia: '%Y-%m-%d', semana: '%Y-%u', mes: '%Y-%m' };
  const fmt = formatMap[agrupar] || '%Y-%m';
  try {
    let q = `SELECT DATE_FORMAT(fecha_realizada,'${fmt}') as periodo,
             SUM(costo) as total, COUNT(*) as servicios
             FROM mantenimientos WHERE 1=1`;
    const params = [];
    if (desde) { q += ' AND fecha_realizada >= ?'; params.push(desde); }
    if (hasta) { q += ' AND fecha_realizada <= ?'; params.push(hasta + ' 23:59:59'); }
    q += ' GROUP BY periodo ORDER BY periodo';
    const [rows] = await db.query(q, params);

    const [totalGeneral] = await db.query(
      `SELECT COALESCE(SUM(costo),0) as total, COUNT(*) as servicios
       FROM mantenimientos WHERE 1=1` +
      (desde ? ' AND fecha_realizada >= ?' : '') +
      (hasta ? ' AND fecha_realizada <= ?' : ''),
      [desde, hasta + ' 23:59:59'].filter(Boolean)
    );

    const [porTipo] = await db.query(
      `SELECT tipo_servicio as name, COUNT(*) as value, SUM(costo) as total
       FROM mantenimientos WHERE 1=1` +
      (desde ? ' AND fecha_realizada >= ?' : '') +
      (hasta ? ' AND fecha_realizada <= ?' : ''),
      [desde, hasta + ' 23:59:59'].filter(Boolean)
    );

    res.json({
      por_periodo: rows.map(d => ({ ...d, total: parseFloat(d.total) })),
      total: parseFloat(totalGeneral[0].total),
      servicios: totalGeneral[0].servicios,
      por_tipo: porTipo.map(d => ({ ...d, total: parseFloat(d.total) }))
    });
  } catch (err) {
    internalError(res, err, 'reportes/dashboard');
  }
});

// GET /api/reportes/gastos-consolidado - Gastos consolidados (combustible + mantenimiento)
router.get('/gastos-consolidado', auth(), async (req, res) => {
  const { desde, hasta, agrupar = 'mes' } = req.query;
  const formatMap = { dia: '%Y-%m-%d', semana: '%Y-%u', mes: '%Y-%m' };
  const fmt = formatMap[agrupar] || '%Y-%m';
  try {
    let qCombustible = `SELECT DATE_FORMAT(fecha_solicitud,'${fmt}') as periodo,
                        SUM(costo_total) as total FROM solicitudes_combustible WHERE 1=1`;
    let qMantenimiento = `SELECT DATE_FORMAT(fecha_realizada,'${fmt}') as periodo,
                          SUM(costo) as total FROM mantenimientos WHERE 1=1`;
    const paramsC = [], paramsM = [];
    if (desde) { qCombustible += ' AND fecha_solicitud >= ?'; paramsC.push(desde); qMantenimiento += ' AND fecha_realizada >= ?'; paramsM.push(desde); }
    if (hasta) { qCombustible += ' AND fecha_solicitud <= ?'; paramsC.push(hasta + ' 23:59:59'); qMantenimiento += ' AND fecha_realizada <= ?'; paramsM.push(hasta + ' 23:59:59'); }
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
    internalError(res, err, 'reportes/dashboard');
  }
});

// GET /api/reportes/vehiculos-recientes - Últimos vehículos registrados
router.get('/vehiculos-recientes', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.id, v.placa, LOWER(COALESCE(tv.nombre, 'camioneta')) as tipo, v.marca, v.modelo, v.color, v.created_at
      FROM vehiculos v
      LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
      WHERE v.activo = 1
      ORDER BY v.created_at DESC LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    internalError(res, err, 'reportes/dashboard');
  }
});

module.exports = router;
