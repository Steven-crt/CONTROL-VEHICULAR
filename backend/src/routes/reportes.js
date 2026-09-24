const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');
const { date } = require('../utils/validate');


router.use((req, res, next) => {
  if (req.method === 'GET') res.setHeader('Cache-Control', 'private, max-age=30');
  next();
});

// Caché en servidor para reportes pesados (dashboard): datos agregados que
// cambian poco. Con 100 usuarios abriendo el dashboard, la BD solo recibe
// 1 cálculo real cada CACHE_TTL_MS en vez de 100. TTL corto por defecto (10s).
// No cachea errores. Se invalida sola por tiempo (sin clave: un solo slot por
// endpoint es suficiente aquí).
const CACHE_TTL_MS = parseInt(process.env.REPORTES_CACHE_MS, 10) || 10000;
const cacheMap = new Map();


function cacheGet(key) {
  const hit = cacheMap.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;
  cacheMap.delete(key);
  return null;
}

function cacheSet(key, data) {
  if (cacheMap.size > 50) cacheMap.clear();
  cacheMap.set(key, { ts: Date.now(), data });
}

// Filtros de fecha compartidos: valida formato y devuelve {desde, hasta}
// como strings seguros 'YYYY-MM-DD' (o null). Rechaza valores malformados.
function filtrosFecha(query) {
  const desde = date(query.desde, { label: 'desde' }).value;
  const hasta = date(query.hasta, { label: 'hasta' }).value;
  if (query.desde && !desde) return { error: 'desde debe tener formato AAAA-MM-DD' };
  if (query.hasta && !hasta) return { error: 'hasta debe tener formato AAAA-MM-DD' };
  return { desde, hasta };
}

// GET /api/reportes/dashboard - stats para el dashboard (gestión vehicular).
// El dashboard muestra la flota completa: es idéntico para todos los usuarios
router.get('/dashboard', auth(['admin']), async (req, res) => {
  const cacheKey = 'dashboard:global';
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);
  try {
    // Todas las queries en PARALELO (Promise.all): cada una viaja por red hasta
    // la BD (~150-250ms de latencia a Aiven). En serie serían 8 latencias;
    // en paralelo, una sola. Reducción típica: 2.5s → 0.4s por petición.
    // Ventana de gastos del dashboard: últimos 6 meses (los mantenimientos/combustible
    // suelen ser de meses anteriores, filtrar solo por el mes actual daba $0.00).
    const VENTANA = "DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
    const [
      [totalVehiculos],
      [gastosCombustible],
      [gastosMantenimiento],
      [porTipo],
      [porMarca],
      [ultimos5],
      [combustible6m],
      [mantenimiento6m],
      [mantPorTipo]
    
      
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM vehiculos WHERE activo = 1'),
      db.query(
        `SELECT COALESCE(SUM(costo_total),0) as total FROM solicitudes_combustible
         WHERE fecha_solicitud >= ${VENTANA}`
      ),
      db.query(
        `SELECT COALESCE(SUM(costo),0) as total FROM mantenimientos
         WHERE fecha_realizada >= ${VENTANA}`
      ),
      db.query(
        `SELECT LOWER(COALESCE(tv.nombre, 'Otro')) as name, COUNT(*) as value
         FROM vehiculos v
         LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
         WHERE v.activo = 1
         GROUP BY tv.nombre`
      ),
      db.query(
        `SELECT marca as name, COUNT(*) as value FROM vehiculos
         WHERE marca IS NOT NULL AND activo = 1 GROUP BY marca ORDER BY value DESC LIMIT 10`
      ),
      db.query(
        `SELECT v.id, v.placa, LOWER(COALESCE(tv.nombre, 'camioneta')) as tipo, v.marca, v.modelo, v.color, v.created_at
         FROM vehiculos v
         LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
         WHERE v.activo = 1
         ORDER BY v.created_at DESC LIMIT 5`
      ),
      db.query(
        `SELECT DATE_FORMAT(fecha_solicitud,'%Y-%m') as periodo, SUM(costo_total) as total
         FROM solicitudes_combustible
         WHERE fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
         GROUP BY periodo ORDER BY periodo`
      ),
      db.query(
        `SELECT DATE_FORMAT(fecha_realizada,'%Y-%m') as periodo, SUM(costo) as total
         FROM mantenimientos
         WHERE fecha_realizada >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
         GROUP BY periodo ORDER BY periodo`
      ),
      db.query(
        `SELECT COALESCE(NULLIF(tipo_servicio,''),'General') as name, COUNT(*) as value
         FROM mantenimientos
         WHERE fecha_realizada >= ${VENTANA}
         GROUP BY name ORDER BY value DESC`
      )
    ]);

    const payload = {
      total_vehiculos: totalVehiculos[0].total,
      gastos_combustible_mes: parseFloat(gastosCombustible[0].total),
      gastos_mantenimiento_mes: parseFloat(gastosMantenimiento[0].total),
      vehiculos_por_tipo: porTipo,
      vehiculos_por_marca: porMarca,
      ultimos_vehiculos: ultimos5,
      combustible_por_mes: combustible6m,
      mantenimiento_por_mes: mantenimiento6m,
      mantenimiento_por_tipo: mantPorTipo
    };
    cacheSet(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    internalError(res, err, 'reportes/dashboard');
  }
});

// ==================== REPORTES DE GESTIÓN DE VEHÍCULOS ====================

router.get('/vehiculos-resumen', auth(['admin']), async (req, res) => {
  try {
    const [[total], [porTipo], [porMarca], [porAnio]] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM vehiculos WHERE activo = 1'),
      db.query(
        `SELECT LOWER(COALESCE(tv.nombre, 'Otro')) as name, COUNT(*) as value
         FROM vehiculos v
         LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
         WHERE v.activo = 1
         GROUP BY tv.nombre`
      ),
      db.query(
        `SELECT marca as name, COUNT(*) as value FROM vehiculos
         WHERE marca IS NOT NULL AND activo = 1 GROUP BY marca ORDER BY value DESC LIMIT 10`
      ),
      db.query(
        `SELECT ano as name, COUNT(*) as value FROM vehiculos
         WHERE ano IS NOT NULL AND activo = 1 GROUP BY ano ORDER BY name DESC LIMIT 10`
      )
    ]);

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
router.get('/combustible-resumen', auth(['admin']), async (req, res) => {
  const ff = filtrosFecha(req.query);
  if (ff.error) return res.status(400).json({ error: ff.error });
  const { desde, hasta } = ff;
    const agrupar = req.query.agrupar || 'mes';
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

      const [[rows], [totalGeneral]] = await Promise.all([
        db.query(q, params),
        db.query(
          `SELECT COALESCE(SUM(costo_total),0) as total, COUNT(*) as cargas, COALESCE(SUM(galones_surtidos),0) as litros
          FROM solicitudes_combustible WHERE 1=1` +
          (desde ? ' AND fecha_solicitud >= ?' : '') +
          (hasta ? ' AND fecha_solicitud <= ?' : ''),
          [desde, hasta + ' 23:59:59'].filter(Boolean)
        )
      ]);

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
  router.get('/mantenimiento-resumen', auth(['admin']), async (req, res) => {
    const ff = filtrosFecha(req.query);
    if (ff.error) return res.status(400).json({ error: ff.error });
    const { desde, hasta } = ff;
    const agrupar = req.query.agrupar || 'mes';
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

      const [[rows], [totalGeneral], [porTipo]] = await Promise.all([
        db.query(q, params),
        (async () => {
          let tq = `SELECT COALESCE(SUM(costo),0) as total, COUNT(*) as servicios
            FROM mantenimientos WHERE 1=1`;
          const tp = [];
          if (desde) { tq += ' AND fecha_realizada >= ?'; tp.push(desde); }
          if (hasta) { tq += ' AND fecha_realizada <= ?'; tp.push(hasta + ' 23:59:59'); }
          return db.query(tq, tp);
        })(),
        (async () => {
          let pq = `SELECT tipo_servicio as name, COUNT(*) as value, SUM(costo) as total
            FROM mantenimientos WHERE 1=1`;
          const pp = [];
          if (desde) { pq += ' AND fecha_realizada >= ?'; pp.push(desde); }
          if (hasta) { pq += ' AND fecha_realizada <= ?'; pp.push(hasta + ' 23:59:59'); }
          pq += ' GROUP BY tipo_servicio';
          return db.query(pq, pp);
        })()
      ]);

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
router.get('/gastos-consolidado', auth(['admin']), async (req, res) => {
  const ff = filtrosFecha(req.query);
  if (ff.error) return res.status(400).json({ error: ff.error });
  const { desde, hasta } = ff;
  const agrupar = req.query.agrupar || 'mes';
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

    const [[comb], [mant]] = await Promise.all([
      db.query(qCombustible, paramsC),
      db.query(qMantenimiento, paramsM)
    ]);

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
router.get('/vehiculos-recientes', auth(['admin']), async (req, res) => {
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

// GET /api/reportes/anomalias-resumen - Resumen de anomalías en el período
router.get('/anomalias-resumen', auth(['admin']), async (req, res) => {
  const ff = filtrosFecha(req.query);
  if (ff.error) return res.status(400).json({ error: ff.error });
  const { desde, hasta } = ff;
  try {
    let w = 'WHERE 1=1';
    const params = [];
    if (desde) { w += ' AND a.created_at >= ?'; params.push(desde); }
    if (hasta) { w += ' AND a.created_at <= ?'; params.push(hasta + ' 23:59:59'); }

    const [[[totales]], [porSeveridad], [porTipo], [recientes]] = await Promise.all([
      db.query(
        `SELECT COUNT(*) as total,
                SUM(a.estado = 'Pendiente') as abiertas,
                SUM(a.estado IN ('Resuelta','Descartada')) as cerradas,
                SUM(a.severidad = 'alta' AND a.estado = 'Pendiente') as criticas_abiertas
        FROM anomalias a ${w}`,
        params
      ),
      db.query(
        `SELECT a.severidad as name, COUNT(*) as value FROM anomalias a ${w}
        GROUP BY a.severidad`,
        params
      ),
      db.query(
        `SELECT a.tipo as name, COUNT(*) as value,
                SUM(a.estado = 'Pendiente') as pendientes
        FROM anomalias a ${w}
        GROUP BY a.tipo ORDER BY value DESC LIMIT 8`,
        params
      ),
      db.query(
        `SELECT a.id, a.codigo, a.tipo, a.severidad, a.descripcion, a.estado, a.created_at,
                v.placa, u.nombre as reportado_por
        FROM anomalias a
        LEFT JOIN vehiculos v ON v.id = a.vehiculo_id
        LEFT JOIN usuarios u ON u.id = a.usuario_id
        ${w}
        ORDER BY a.created_at DESC LIMIT 6`,
        params
      )
    ]);

    res.json({
      total: totales.total || 0,
      abiertas: totales.abiertas || 0,
      cerradas: totales.cerradas || 0,
      criticas_abiertas: totales.criticas_abiertas || 0,
      por_severidad: porSeveridad,
      por_tipo: porTipo.map(t => ({ ...t, pendientes: t.pendientes || 0 })),
      recientes: recientes
    });
  } catch (err) {
    internalError(res, err, 'reportes/anomalias');
  }
});

module.exports = router;
