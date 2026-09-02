const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');
const { str, num, intId, date, body } = require('../utils/validate');
const { EVENTOS, logEvento } = require('../utils/audit');
const { EVENTOS: RT, emitirCambio } = require('../realtime');

const LIMIT_MAX = 200;

function parseLimit(valor) {
  const n = parseInt(valor, 10);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(n, LIMIT_MAX);
}

// Valores válidos para tipo_combustible (evita valores arbitrarios del cliente)
const TIPOS_COMBUSTIBLE_VALIDOS = ['Gasolina', 'Corriente', 'Extra', 'Diesel', 'ACPM', 'Gas', 'Gas Natural', 'Eléctrico', 'Híbrido'];

// km_anterior con LAG() en una sola pasada sobre el historial completo
// (sustituye la subquery correlacionada por fila que escalaba mal)
const CARGA_SELECT = `
  WITH historial_km AS (
    SELECT id, vehiculo_id, fecha_solicitud, kilometraje_actual,
      LAG(kilometraje_actual) OVER (PARTITION BY vehiculo_id ORDER BY fecha_solicitud, id) AS km_anterior
    FROM solicitudes_combustible
  )
  SELECT c.id, c.codigo, c.vehiculo_id, v.placa, v.marca, v.modelo,
    c.galones_solicitados AS litros_solicitados,
    c.galones_surtidos AS litros,
    c.precio_por_galon AS precio_unitario,
    c.costo_total,
    c.kilometraje_actual AS km_actual,
    c.tipo_combustible, c.estado,
    c.fecha_solicitud AS fecha_carga,
    c.fecha_atencion, c.solicitante_id, c.atendido_por_id, c.observaciones,
    sol.nombre AS solicitante_nombre,
    atendido.nombre AS atendido_por_nombre,
    hk.km_anterior
  FROM solicitudes_combustible c
  JOIN vehiculos v ON c.vehiculo_id = v.id
  LEFT JOIN historial_km hk ON hk.id = c.id
  LEFT JOIN usuarios sol ON sol.id = c.solicitante_id
  LEFT JOIN usuarios atendido ON atendido.id = c.atendido_por_id
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
// ?estado=Pendiente|Surtida|Rechazada  filtra por estado
// ?solo_mios=1                         solo lo solicitado por el usuario actual
router.get('/', auth(), async (req, res) => {
  const { vehiculo_id, tipo_combustible, desde, hasta } = req.query;
  const limit = parseLimit(req.query.limit);
  try {
    let q = `${CARGA_SELECT} WHERE 1=1`;
    const params = [];
    const idVehiculo = num(vehiculo_id, { min: 1, max: 2147483647, label: 'vehiculo_id' }).value;
    if (idVehiculo !== null) { q += ' AND c.vehiculo_id = ?'; params.push(idVehiculo); }
    if (tipo_combustible && typeof tipo_combustible === 'string' && tipo_combustible.length <= 30) {
      q += ' AND c.tipo_combustible = ?';
      params.push(tipo_combustible.trim());
    }
    if (req.query.estado && ['Pendiente', 'Surtida', 'Rechazada'].includes(String(req.query.estado))) {
      q += ' AND c.estado = ?';
      params.push(String(req.query.estado));
    }
    // Un empleado solo puede listar sus propias solicitudes con solo_mios;
    // el admin puede filtrar por cualquier solicitante.
    if (String(req.query.solo_mios || '') === '1') {
      q += ' AND c.solicitante_id = ?';
      params.push(req.user.id);
    }
    const desdeVal = date(desde, { label: 'desde' }).value;
    if (desdeVal) { q += ' AND c.fecha_solicitud >= ?'; params.push(desdeVal); }
    const hastaVal = date(hasta, { label: 'hasta' }).value;
    if (hastaVal) { q += ' AND c.fecha_solicitud <= ?'; params.push(hastaVal + ' 23:59:59'); }
    q += ' ORDER BY c.fecha_solicitud DESC LIMIT ?';
    params.push(limit);

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
    internalError(res, err, 'combustible');
  }
});

// GET /api/combustible/historial/:vehiculo_id - Historial completo con rendimiento
router.get('/historial/:vehiculo_id', auth(), async (req, res) => {
  const vehiculoId = intId(req.params.vehiculo_id, { label: 'vehiculo_id' }).value;
  const { tipo_combustible } = req.query;
  const limit = parseLimit(req.query.limit);
  try {
    let q = `${CARGA_SELECT} WHERE c.vehiculo_id = ?`;
    const params = [vehiculoId];
    if (tipo_combustible && typeof tipo_combustible === 'string' && tipo_combustible.length <= 30) {
      q += ' AND c.tipo_combustible = ?';
      params.push(tipo_combustible.trim());
    }
    q += ' ORDER BY c.fecha_solicitud DESC LIMIT ?';
    params.push(limit);

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
    internalError(res, err, 'combustible');
  }
});

// POST /api/combustible - Registrar carga de combustible
// - admin: registra directamente como 'Surtida' (carga confirmada)
// - empleado: crea una SOLICITUD 'Pendiente' que el admin aprueba después.
//   Los costos enviados por un empleado se ignoran (solo el admin fija costos).
router.post('/', auth(), async (req, res) => {
  const validado = body({
    vehiculo_id: [intId, { label: 'vehiculo_id' }],
    litros: [num, { min: 0.01, max: 100000, required: true, label: 'litros' }],
    precio_unitario: [num, { min: 0, max: 10000000, label: 'precio unitario' }],
    costo_total: [num, { min: 0, max: 1000000000, label: 'costo total' }],
    km_actual: [num, { min: 0, max: 9999999, required: true, label: 'km actual' }],
    tipo_combustible: [str, { max: 30, label: 'tipo de combustible' }],
    observaciones: [str, { max: 500, label: 'observaciones' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });
  const { vehiculo_id, litros, precio_unitario, costo_total, km_actual, tipo_combustible, observaciones } = validado.values;

  // ubicacion_gps se valida aparte (es objeto anidado, no entra al esquema)
  const ubicacion_gps = req.body.ubicacion_gps;
  if (ubicacion_gps !== undefined && ubicacion_gps !== null) {
    const lat = Number(ubicacion_gps.latitud);
    const lng = Number(ubicacion_gps.longitud);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      return res.status(400).json({ error: 'Latitud inválida' });
    if (!Number.isFinite(lng) || lng < -180 || lng > 180)
      return res.status(400).json({ error: 'Longitud inválida' });
  }

  try {
    const esAdmin = req.user?.rol === 'admin';
    const esPendiente = !esAdmin;
    const tipoCombustibleValido = tipo_combustible && TIPOS_COMBUSTIBLE_VALIDOS.includes(tipo_combustible)
      ? tipo_combustible : 'Gasolina';

    const costo = esPendiente ? 0 : (costo_total ?? (litros * (precio_unitario || 0)));
    const precio = esPendiente ? 0 : (precio_unitario || 0);

    const [result] = await db.query(
      `INSERT INTO solicitudes_combustible
        (codigo, vehiculo_id, solicitante_id, galones_solicitados, galones_surtidos, precio_por_galon, costo_total, kilometraje_actual, tipo_combustible, estado, fecha_solicitud, fecha_atencion, atendido_por_id, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        genCodigo('SC'),
        vehiculo_id,
        req.user?.id || null,
        litros,
        esPendiente ? null : litros,
        precio,
        costo,
        km_actual,
        tipoCombustibleValido,
        esPendiente ? 'Pendiente' : 'Surtida',
        esPendiente ? null : new Date(),
        esPendiente ? null : (req.user?.id || null),
        observaciones || ''
      ]
    );

    if (ubicacion_gps) {
      await db.query(
        'INSERT INTO ubicaciones (vehiculo_id, usuario_id, latitud, longitud, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [vehiculo_id, req.user?.id || null, ubicacion_gps.latitud, ubicacion_gps.longitud]
      );
    }

    // El kilometraje del vehículo solo se actualiza cuando la carga está surtida:
    // una solicitud pendiente aún no es un evento real.
    if (!esPendiente) {
      await actualizarKmVehiculo(vehiculo_id, km_actual);
      emitirCambio(RT.COMBUSTIBLE, { accion: 'nuevo', id: result.insertId, vehiculo_id });
      res.status(201).json({ id: result.insertId, message: 'Carga de combustible registrada', estado: 'Surtida' });
    } else {
      emitirCambio(RT.COMBUSTIBLE, { accion: 'nuevo', id: result.insertId, vehiculo_id });
      res.status(201).json({
        id: result.insertId,
        message: 'Solicitud de combustible creada. Queda pendiente de aprobación.',
        estado: 'Pendiente'
      });
    }
  } catch (err) {
    internalError(res, err, 'combustible');
  }
});

// PUT /api/combustible/:id/atender - Aprobar/surtir una solicitud pendiente (admin)
// Opcionalmente acepta galones_surtidos / precio_por_galon / costo_total para
// ajustar los valores finales al momento de surtir.
router.put('/:id/atender', auth(['admin']), async (req, res) => {
  const id = intId(req.params.id, { label: 'id' }).value;
  const galones = num(req.body?.galones_surtidos, { min: 0.01, max: 100000, label: 'galones surtidos' });
  const precio = num(req.body?.precio_por_galon, { min: 0, max: 10000000, label: 'precio por galón' });
  const costo = num(req.body?.costo_total, { min: 0, max: 1000000000, label: 'costo total' });
  if (galones.ok === false) return res.status(400).json({ error: galones.error });
  if (precio.ok === false) return res.status(400).json({ error: precio.error });
  if (costo.ok === false) return res.status(400).json({ error: costo.error });

  try {
    const [rows] = await db.query(
      'SELECT * FROM solicitudes_combustible WHERE id = ? AND estado = \'Pendiente\'',
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Solicitud no encontrada o ya atendida' });

    const sol = rows[0];
    const galonesFinal = galones.value ?? sol.galones_solicitados;
    const precioFinal = precio.value ?? sol.precio_por_galon ?? 0;
    const costoFinal = costo.value ?? (galonesFinal * (precioFinal || 0));

    await db.query(
      `UPDATE solicitudes_combustible
       SET estado = 'Surtida', galones_surtidos = ?, precio_por_galon = ?, costo_total = ?,
           fecha_atencion = NOW(), atendido_por_id = ?
       WHERE id = ?`,
      [galonesFinal, precioFinal, costoFinal, req.user.id, id]
    );

    await actualizarKmVehiculo(sol.vehiculo_id, sol.kilometraje_actual);
    logEvento(EVENTOS.ACCION_ADMIN, req, `aprobó solicitud combustible id=${id}`);
    emitirCambio(RT.COMBUSTIBLE, { accion: 'atendida', id, vehiculo_id: sol.vehiculo_id });
    res.json({ message: 'Solicitud surtida', estado: 'Surtida' });
  } catch (err) {
    internalError(res, err, 'combustible');
  }
});

// PUT /api/combustible/:id/rechazar - Rechazar una solicitud pendiente (admin)
router.put('/:id/rechazar', auth(['admin']), async (req, res) => {
  const id = intId(req.params.id, { label: 'id' }).value;
  try {
    const [result] = await db.query(
      `UPDATE solicitudes_combustible
       SET estado = 'Rechazada', fecha_atencion = NOW(), atendido_por_id = ?
       WHERE id = ? AND estado = 'Pendiente'`,
      [req.user.id, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Solicitud no encontrada o ya atendida' });

    logEvento(EVENTOS.ACCION_ADMIN, req, `rechazó solicitud combustible id=${id}`);
    emitirCambio(RT.COMBUSTIBLE, { accion: 'rechazada', id, vehiculo_id: null });
    res.json({ message: 'Solicitud rechazada', estado: 'Rechazada' });
  } catch (err) {
    internalError(res, err, 'combustible');
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
    internalError(res, err, 'combustible');
  }
});

module.exports = router;
