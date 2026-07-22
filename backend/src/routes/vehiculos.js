const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/vehiculos - Listar vehículos con filtro por año y última ubicación
router.get('/', auth(), async (req, res) => {
  const { year, search } = req.query;
  try {
    let q = `
      SELECT v.*, c.nombre as cliente_nombre, c.cedula as cliente_cedula,
        c.telefono as cliente_telefono,
        (SELECT latitud FROM ubicaciones WHERE vehiculo_id = v.id ORDER BY timestamp DESC LIMIT 1) as ultima_latitud,
        (SELECT longitud FROM ubicaciones WHERE vehiculo_id = v.id ORDER BY timestamp DESC LIMIT 1) as ultima_longitud,
        (SELECT timestamp FROM ubicaciones WHERE vehiculo_id = v.id ORDER BY timestamp DESC LIMIT 1) as ultima_ubicacion_fecha,
        (SELECT km_actual FROM combustible WHERE vehiculo_id = v.id ORDER BY fecha_carga DESC LIMIT 1) as km_actual,
        (SELECT fecha_carga FROM combustible WHERE vehiculo_id = v.id ORDER BY fecha_carga DESC LIMIT 1) as ultima_carga_fecha
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    // El campo 'año' no existe en vehiculos, usamos el created_at como referencia
    // O permitimos búsqueda por placa/marca como alternativa
    if (year && !isNaN(year)) {
      q += ' AND YEAR(v.created_at) = ?';
      params.push(parseInt(year));
    }
    if (search) {
      q += ' AND (v.placa LIKE ? OR v.marca LIKE ? OR v.color LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    q += ' ORDER BY v.placa ASC';
    
    const [rows] = await db.query(q, params);
    
    // Enriquecer con datos de último combustible y ubicación
    const result = await Promise.all(rows.map(async (v) => {
      // Obtener último km de combustible o kilometraje_manual
      const [ultimoKm] = await db.query(`
        SELECT COALESCE(
          (SELECT km_actual FROM combustible WHERE vehiculo_id = ? ORDER BY fecha_carga DESC LIMIT 1),
          (SELECT km_actual FROM kilometraje_manual WHERE vehiculo_id = ? ORDER BY fecha_registro DESC LIMIT 1),
          0
        ) as km_actual
      `, [v.id, v.id]);
      
      return {
        ...v,
        km_actual: parseInt(ultimoKm[0]?.km_actual) || 0,
        ultima_ubicacion: v.ultima_latitud ? {
          latitud: parseFloat(v.ultima_latitud),
          longitud: parseFloat(v.ultima_longitud),
          fecha: v.ultima_ubicacion_fecha
        } : null
      };
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error en GET /vehiculos:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vehiculos - Crear nuevo vehículo (solo admin)
router.post('/', auth(['admin']), async (req, res) => {
  const { placa, tipo, color, marca, modelo, anio, cliente_id } = req.body;
  if (!placa) return res.status(400).json({ error: 'Placa es requerida' });
  try {
    const toIntOrNull = (v) => (v === '' || v === null || v === undefined) ? null : parseInt(v);
    const [result] = await db.query(
      'INSERT INTO vehiculos (placa, tipo, color, marca, modelo, anio, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        placa.toUpperCase(),
        tipo || 'auto',
        color || null,
        marca || null,
        modelo || null,
        toIntOrNull(anio),
        toIntOrNull(cliente_id)
      ]
    );
    res.status(201).json({ id: result.insertId, message: 'Vehículo registrado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe un vehículo con esa placa' });
    console.error('Error en POST /vehiculos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vehiculos/:id - Detalle de vehículo con toda la información
router.get('/:id', auth(), async (req, res) => {
  try {
    const [vehiculos] = await db.query(`
      SELECT v.*, c.nombre as cliente_nombre, c.cedula, c.telefono, c.email as cliente_email,
        c.tipo_membresia
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `, [req.params.id]);
    
    if (!vehiculos.length)
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    
    const v = vehiculos[0];
    
    // Última ubicación
    const [ubicacion] = await db.query(
      'SELECT * FROM ubicaciones WHERE vehiculo_id = ? ORDER BY timestamp DESC LIMIT 1',
      [v.id]
    );
    
    // Último km (combustible o manual)
    const [ultimoKm] = await db.query(`
      SELECT COALESCE(
        (SELECT km_actual FROM combustible WHERE vehiculo_id = ? ORDER BY fecha_carga DESC LIMIT 1),
        (SELECT km_actual FROM kilometraje_manual WHERE vehiculo_id = ? ORDER BY fecha_registro DESC LIMIT 1),
        0
      ) as km_actual
    `, [v.id, v.id]);
    
    // Totales de cargas de combustible
    const [totalesCombustible] = await db.query(`
      SELECT COUNT(*) as total_cargas, COALESCE(SUM(litros),0) as total_litros,
        COALESCE(SUM(costo_total),0) as total_gasto
      FROM combustible WHERE vehiculo_id = ?
    `, [v.id]);
    
    // Total mantenimientos
    const [totalesMantenimiento] = await db.query(`
      SELECT COUNT(*) as total_mantenimientos, COALESCE(SUM(costo),0) as total_gasto
      FROM mantenimiento WHERE vehiculo_id = ?
    `, [v.id]);
    
    res.json({
      ...v,
      km_actual: parseInt(ultimoKm[0]?.km_actual) || 0,
      ultima_ubicacion: ubicacion.length ? {
        latitud: parseFloat(ubicacion[0].latitud),
        longitud: parseFloat(ubicacion[0].longitud),
        fecha: ubicacion[0].timestamp
      } : null,
      totales: {
        combustible: totalesCombustible[0],
        mantenimiento: totalesMantenimiento[0]
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vehiculos/:id/ubicacion - Última ubicación GPS
router.get('/:id/ubicacion', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM ubicaciones WHERE vehiculo_id = ? ORDER BY timestamp DESC LIMIT 1',
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'No hay ubicaciones registradas para este vehículo' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vehiculos/:id/ubicacion - Registrar nueva ubicación GPS
router.post('/:id/ubicacion', auth(), async (req, res) => {
  const { latitud, longitud } = req.body;
  if (!latitud || !longitud)
    return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
  
  try {
    const [result] = await db.query(
      'INSERT INTO ubicaciones (vehiculo_id, latitud, longitud) VALUES (?, ?, ?)',
      [req.params.id, latitud, longitud]
    );
    res.status(201).json({ id: result.insertId, message: 'Ubicación registrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vehiculos/:id/kilometraje - Registrar avance manual de KM
router.post('/:id/kilometraje', auth(), async (req, res) => {
  const { km_actual, observaciones } = req.body;
  if (!km_actual || isNaN(km_actual))
    return res.status(400).json({ error: 'KM actual es requerido y debe ser numérico' });
  
  try {
    const [result] = await db.query(
      'INSERT INTO kilometraje_manual (vehiculo_id, km_actual, observaciones) VALUES (?, ?, ?)',
      [req.params.id, parseInt(km_actual), observaciones || '']
    );
    res.status(201).json({ id: result.insertId, message: 'Kilometraje registrado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vehiculos/:id/historial-km - Historial de KM (combustible + manual)
router.get('/:id/historial-km', auth(), async (req, res) => {
  try {
    const [combustible] = await db.query(
      `SELECT fecha_carga as fecha, km_actual, litros, 'combustible' as tipo
       FROM combustible WHERE vehiculo_id = ? ORDER BY fecha_carga ASC`,
      [req.params.id]
    );
    const [manual] = await db.query(
      `SELECT fecha_registro as fecha, km_actual, NULL as litros, 'manual' as tipo
       FROM kilometraje_manual WHERE vehiculo_id = ? ORDER BY fecha_registro ASC`,
      [req.params.id]
    );
    // Combinar y ordenar
    const historial = [...combustible, ...manual].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    res.json(historial);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/vehiculos/:id - Actualizar vehículo (solo admin)
router.put('/:id', auth(['admin']), async (req, res) => {
  const { placa, tipo, color, marca, modelo, anio, cliente_id } = req.body;
  try {
    const [existing] = await db.query('SELECT * FROM vehiculos WHERE id = ?', [req.params.id]);
    if (!existing.length)
      return res.status(404).json({ error: 'Vehículo no encontrado' });

    const toIntOrNull = (v) => (v === '' || v === null || v === undefined) ? null : parseInt(v);

    await db.query(
      'UPDATE vehiculos SET placa = ?, tipo = ?, color = ?, marca = ?, modelo = ?, anio = ?, cliente_id = ? WHERE id = ?',
      [
        placa || existing[0].placa,
        tipo || existing[0].tipo,
        color !== undefined ? color : existing[0].color,
        marca !== undefined ? marca : existing[0].marca,
        modelo !== undefined ? modelo : existing[0].modelo,
        anio !== undefined ? toIntOrNull(anio) : existing[0].anio,
        cliente_id !== undefined ? toIntOrNull(cliente_id) : existing[0].cliente_id,
        req.params.id
      ]
    );

    const [updated] = await db.query(
      'SELECT v.*, c.nombre as cliente_nombre FROM vehiculos v LEFT JOIN clientes c ON v.cliente_id = c.id WHERE v.id = ?',
      [req.params.id]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error('Error en PUT /vehiculos:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vehiculos/:id - Eliminar vehículo (solo admin)
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM vehiculos WHERE id = ?', [req.params.id]);
    if (!existing.length)
      return res.status(404).json({ error: 'Vehículo no encontrado' });

    await db.query('DELETE FROM vehiculos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (err) {
    console.error('Error en DELETE /vehiculos:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
