const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { str, num, date, intId, body } = require('../utils/validate');
const { internalError } = require('../utils/httpErrors');

const LIMIT_MAX = 200;

function parseLimit(valor) {
  const n = parseInt(valor, 10);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(n, LIMIT_MAX);
}

// Devuelve el estado de vigencia del SOAT basado en la fecha de vencimiento
function getSoatEstado(v) {
  const fechaVenc = v.soat_fecha_vencimiento;
  if (!fechaVenc) return { vigente: false, estado: 'sin_soat' };
  const hoy = new Date();
  const venc = new Date(fechaVenc);
  if (isNaN(venc.getTime())) return { vigente: false, estado: 'sin_soat' };

  const vencUnix = venc.getTime();
  const hoyUnix = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

  if (vencUnix < hoyUnix) return { vigente: false, estado: 'vencido' };
  const diasRestantes = Math.ceil((vencUnix - hoyUnix) / 86400000);
  if (diasRestantes <= 30) return { vigente: true, estado: 'por_vencer', dias_restantes: diasRestantes };
  return { vigente: true, estado: 'vigente', dias_restantes: diasRestantes };
}

function enriquecerConSoat(v) {
  return { ...v, soat: getSoatEstado(v) };
}

async function tipoVehiculoId(tipo) {
  const nombre = (tipo || 'Camioneta').trim();
  const [rows] = await db.query(
    'SELECT id FROM tipos_vehiculo WHERE LOWER(nombre) = LOWER(?) LIMIT 1',
    [nombre]
  );
  return rows.length ? rows[0].id : 1;
}

// GET /api/vehiculos - Listar vehículos con filtro por año y última ubicación
router.get('/', auth(), async (req, res) => {
  const { year, search } = req.query;
  const limit = parseLimit(req.query.limit);
  try {
    // Última ubicación con ROW_NUMBER() en una sola pasada sobre ubicaciones
    // (una subquery correlacionada por fila escalaba mal con muchos vehículos)
    let q = `
      SELECT v.*,
        LOWER(COALESCE(tv.nombre, 'Camioneta')) AS tipo,
        v.ano AS anio,
        v.kilometraje_actual AS km_actual,
        sc.ultima_carga_fecha,
        ub.ultima_latitud,
        ub.ultima_longitud,
        ub.ultima_ubicacion_fecha
      FROM vehiculos v
      LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
      LEFT JOIN (
        SELECT vehiculo_id, MAX(fecha_solicitud) AS ultima_carga_fecha
        FROM solicitudes_combustible
        GROUP BY vehiculo_id
      ) sc ON sc.vehiculo_id = v.id
      LEFT JOIN (
        SELECT vehiculo_id, ultima_latitud, ultima_longitud, ultima_ubicacion_fecha
        FROM (
          SELECT vehiculo_id,
            latitud AS ultima_latitud,
            longitud AS ultima_longitud,
            timestamp AS ultima_ubicacion_fecha,
            ROW_NUMBER() OVER (PARTITION BY vehiculo_id ORDER BY timestamp DESC) AS rn
          FROM ubicaciones
        ) ult
        WHERE rn = 1
      ) ub ON ub.vehiculo_id = v.id
      WHERE v.activo = 1
    `;
    const params = [];

    if (year && !isNaN(year)) {
      q += ' AND v.ano = ?';
      params.push(parseInt(year));
    }
    if (search) {
      // Limitar longitud del término de búsqueda
      const termino = String(search).slice(0, 100);
      q += ' AND (v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? OR v.color LIKE ?)';
      params.push(`%${termino}%`, `%${termino}%`, `%${termino}%`, `%${termino}%`);
    }
    q += ' ORDER BY v.placa ASC LIMIT ?';
    params.push(limit);

    const [rows] = await db.query(q, params);

    const result = rows.map((v) => ({
      ...v,
      km_actual: parseFloat(v.km_actual) || 0,
      ultima_ubicacion: v.ultima_latitud ? {
        latitud: parseFloat(v.ultima_latitud),
        longitud: parseFloat(v.ultima_longitud),
        fecha: v.ultima_ubicacion_fecha
      } : null
    }));

    res.json(result.map(enriquecerConSoat));
  } catch (err) {
    internalError(res, err, 'vehiculos');
  }
});

// POST /api/vehiculos - Crear nuevo vehículo (solo admin)
router.post('/', auth(['admin']), async (req, res) => {
  const validado = body({
    placa: [str, { max: 15, required: true, label: 'placa' }],
    tipo: [str, { max: 50, label: 'tipo' }],
    color: [str, { max: 30, label: 'color' }],
    marca: [str, { max: 50, label: 'marca' }],
    modelo: [str, { max: 50, label: 'modelo' }],
    anio: [num, { min: 1900, max: 2100, label: 'año' }],
    soat_numero: [str, { max: 50, label: 'número de SOAT' }],
    soat_empresa: [str, { max: 100, label: 'aseguradora' }],
    soat_fecha_inicio: [date, { label: 'fecha de inicio SOAT' }],
    soat_fecha_vencimiento: [date, { label: 'fecha de vencimiento SOAT' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });
  const { placa, tipo, color, marca, modelo, anio, soat_numero, soat_empresa, soat_fecha_inicio, soat_fecha_vencimiento } = validado.values;

  if (!soat_numero || !soat_empresa || !soat_fecha_vencimiento)
    return res.status(400).json({ error: 'Los datos del SOAT (número, aseguradora y fecha de vencimiento) son obligatorios' });
  try {
    const tipoId = await tipoVehiculoId(tipo);
    const [result] = await db.query(
      `INSERT INTO vehiculos (placa, tipo_vehiculo_id, color, marca, modelo, ano, soat_numero, soat_empresa, soat_fecha_inicio, soat_fecha_vencimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        placa.toUpperCase(),
        tipoId,
        color || null,
        marca || 'Sin especificar',
        modelo || 'Sin especificar',
        anio || new Date().getFullYear(),
        soat_numero || null,
        soat_empresa || null,
        soat_fecha_inicio,
        soat_fecha_vencimiento
      ]
    );
    res.status(201).json({ id: result.insertId, message: 'Vehículo registrado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe un vehículo con esa placa' });
    internalError(res, err, 'vehiculos');
  }
});

// GET /api/vehiculos/:id - Detalle de vehículo con toda la información
router.get('/:id', auth(), async (req, res) => {
  const id = intId(req.params.id).value;
  try {
    const [vehiculos] = await db.query(`
      SELECT v.*,
        LOWER(COALESCE(tv.nombre, 'Camioneta')) AS tipo,
        v.ano AS anio,
        v.kilometraje_actual AS km_actual
      FROM vehiculos v
      LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
      WHERE v.id = ? AND v.activo = 1
    `, [id]);

    if (!vehiculos.length)
      return res.status(404).json({ error: 'Vehículo no encontrado' });

    const v = vehiculos[0];

    // Última ubicación
    const [ubicacion] = await db.query(
      'SELECT latitud, longitud, timestamp FROM ubicaciones WHERE vehiculo_id = ? ORDER BY timestamp DESC LIMIT 1',
      [v.id]
    );

    // Totales de cargas de combustible
    const [totalesCombustible] = await db.query(`
      SELECT COUNT(*) as total_cargas, COALESCE(SUM(galones_surtidos),0) as total_litros,
        COALESCE(SUM(costo_total),0) as total_gasto
      FROM solicitudes_combustible WHERE vehiculo_id = ?
    `, [v.id]);

    // Total mantenimientos
    const [totalesMantenimiento] = await db.query(`
      SELECT COUNT(*) as total_mantenimientos, COALESCE(SUM(costo),0) as total_gasto
      FROM mantenimientos WHERE vehiculo_id = ?
    `, [v.id]);

    res.json({
      ...v,
      km_actual: parseFloat(v.km_actual) || 0,
      ultima_ubicacion: ubicacion.length ? {
        latitud: parseFloat(ubicacion[0].latitud),
        longitud: parseFloat(ubicacion[0].longitud),
        fecha: ubicacion[0].timestamp
      } : null,
      soat: getSoatEstado(v),
      totales: {
        combustible: totalesCombustible[0],
        mantenimiento: totalesMantenimiento[0]
      }
    });
  } catch (err) {
    internalError(res, err, 'vehiculos');
  }
});

// GET /api/vehiculos/:id/ubicacion - Última ubicación GPS
router.get('/:id/ubicacion', auth(), async (req, res) => {
  const id = intId(req.params.id).value;
  try {
    const [rows] = await db.query(
      'SELECT latitud, longitud, timestamp FROM ubicaciones WHERE vehiculo_id = ? ORDER BY timestamp DESC LIMIT 1',
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'No hay ubicaciones registradas para este vehículo' });
    res.json(rows[0]);
  } catch (err) {
    internalError(res, err, 'vehiculos');
  }
});

// POST /api/vehiculos/:id/ubicacion - Registrar nueva ubicación GPS
router.post('/:id/ubicacion', auth(), async (req, res) => {
  const id = intId(req.params.id).value;
  const { latitud, longitud } = req.body;
  if (latitud === undefined || longitud === undefined)
    return res.status(400).json({ error: 'Latitud y longitud son requeridas' });

  const lat = parseFloat(latitud);
  const lng = parseFloat(longitud);

  if (isNaN(lat) || isNaN(lng))
    return res.status(400).json({ error: 'Latitud y longitud deben ser valores numéricos' });
  if (lat < -90 || lat > 90)
    return res.status(400).json({ error: 'Latitud debe estar entre -90 y 90' });
  if (lng < -180 || lng > 180)
    return res.status(400).json({ error: 'Longitud debe estar entre -180 y 180' });

  try {
    const [result] = await db.query(
      'INSERT INTO ubicaciones (vehiculo_id, usuario_id, latitud, longitud, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [id, req.user?.id || null, lat, lng]
    );
    res.status(201).json({ id: result.insertId, message: 'Ubicación registrada' });
  } catch (err) {
    internalError(res, err, 'vehiculos');
  }
});

// POST /api/vehiculos/:id/kilometraje - Registrar avance manual de KM
router.post('/:id/kilometraje', auth(), async (req, res) => {
  const id = intId(req.params.id).value;
  const { km_actual } = req.body;
  if (km_actual === undefined || km_actual === null || km_actual === '')
    return res.status(400).json({ error: 'KM actual es requerido' });

  const km = parseFloat(km_actual);
  if (isNaN(km))
    return res.status(400).json({ error: 'KM actual debe ser un valor numérico' });
  if (km < 0 || km > 9999999)
    return res.status(400).json({ error: 'KM actual fuera de rango válido (0 - 9,999,999)' });

  try {
    await db.query(
      'UPDATE vehiculos SET kilometraje_actual = ? WHERE id = ?',
      [km, id]
    );
    res.status(201).json({ message: 'Kilometraje registrado exitosamente' });
  } catch (err) {
    internalError(res, err, 'vehiculos');
  }
});

// GET /api/vehiculos/:id/historial-km - Historial de KM (combustible)
router.get('/:id/historial-km', auth(), async (req, res) => {
  const id = intId(req.params.id).value;
  try {
    const [combustible] = await db.query(
      `SELECT fecha_solicitud as fecha, kilometraje_actual as km_actual, galones_surtidos as litros, 'combustible' as tipo
       FROM solicitudes_combustible WHERE vehiculo_id = ? ORDER BY fecha_solicitud ASC`,
      [id]
    );
    res.json(combustible);
  } catch (err) {
    internalError(res, err, 'vehiculos');
  }
});

// PUT /api/vehiculos/:id - Actualizar vehículo (solo admin)
router.put('/:id', auth(['admin']), async (req, res) => {
  const id = intId(req.params.id).value;
  const validado = body({
    placa: [str, { max: 15, label: 'placa' }],
    tipo: [str, { max: 50, label: 'tipo' }],
    color: [str, { max: 30, label: 'color' }],
    marca: [str, { max: 50, label: 'marca' }],
    modelo: [str, { max: 50, label: 'modelo' }],
    anio: [num, { min: 1900, max: 2100, label: 'año' }],
    soat_numero: [str, { max: 50, label: 'número de SOAT' }],
    soat_empresa: [str, { max: 100, label: 'aseguradora' }],
    soat_fecha_inicio: [date, { label: 'fecha de inicio SOAT' }],
    soat_fecha_vencimiento: [date, { label: 'fecha de vencimiento SOAT' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });
  const { placa, tipo, color, marca, modelo, anio, soat_numero, soat_empresa, soat_fecha_inicio, soat_fecha_vencimiento } = validado.values;
  try {
    const [existing] = await db.query('SELECT * FROM vehiculos WHERE id = ?', [id]);
    if (!existing.length)
      return res.status(404).json({ error: 'Vehículo no encontrado' });

    const nuevoSoatNumero = soat_numero !== undefined ? soat_numero : existing[0].soat_numero;
    const nuevoSoatEmpresa = soat_empresa !== undefined ? soat_empresa : existing[0].soat_empresa;
    const nuevoSoatVenc = soat_fecha_vencimiento !== undefined ? soat_fecha_vencimiento : existing[0].soat_fecha_vencimiento;
    if (!nuevoSoatNumero || !nuevoSoatEmpresa || !nuevoSoatVenc)
      return res.status(400).json({ error: 'Los datos del SOAT (número, aseguradora y fecha de vencimiento) son obligatorios' });

    const tipoId = await tipoVehiculoId(tipo !== undefined ? tipo : existing[0].tipo_vehiculo_id);
    const anioValue = anio !== undefined && anio !== null ? anio : existing[0].ano;

    await db.query(
      `UPDATE vehiculos SET placa = ?, tipo_vehiculo_id = ?, color = ?, marca = ?, modelo = ?, ano = ?,
        soat_numero = ?, soat_empresa = ?, soat_fecha_inicio = ?, soat_fecha_vencimiento = ?
       WHERE id = ?`,
      [
        placa ? placa.toUpperCase() : existing[0].placa,
        tipoId,
        color !== undefined ? color : existing[0].color,
        marca !== undefined ? marca : existing[0].marca,
        modelo !== undefined ? modelo : existing[0].modelo,
        anioValue,
        nuevoSoatNumero,
        nuevoSoatEmpresa,
        soat_fecha_inicio !== undefined ? soat_fecha_inicio : existing[0].soat_fecha_inicio,
        nuevoSoatVenc,
        id
      ]
    );

    const [updated] = await db.query(
      `SELECT v.*, LOWER(COALESCE(tv.nombre, 'Camioneta')) AS tipo,
        v.ano AS anio, v.kilometraje_actual AS km_actual
       FROM vehiculos v
       LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
       WHERE v.id = ?`,
      [id]
    );
    res.json(enriquecerConSoat({ ...updated[0], km_actual: parseFloat(updated[0].km_actual) || 0 }));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe un vehículo con esa placa' });
    internalError(res, err, 'vehiculos');
  }
});

// DELETE /api/vehiculos/:id - Desactivar vehículo (solo admin)
router.delete('/:id', auth(['admin']), async (req, res) => {
  const id = intId(req.params.id).value;
  try {
    const [existing] = await db.query('SELECT id FROM vehiculos WHERE id = ?', [id]);
    if (!existing.length)
      return res.status(404).json({ error: 'Vehículo no encontrado' });

    await db.query('UPDATE vehiculos SET activo = 0 WHERE id = ?', [id]);
    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (err) {
    internalError(res, err, 'vehiculos');
  }
});

module.exports = router;
