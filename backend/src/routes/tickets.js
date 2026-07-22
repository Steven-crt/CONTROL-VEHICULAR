const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Generar código único de ticket
function generarCodigo() {
  const fecha = new Date();
  const ymd = fecha.toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4,'0');
  return `TK${ymd}${rand}`;
}

// GET /api/tickets/activos
router.get('/activos', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, e.numero as espacio_numero, e.zona_id, z.nombre as zona_nombre,
             u.nombre as operador_nombre
      FROM tickets t
      LEFT JOIN espacios e ON t.espacio_id = e.id
      LEFT JOIN zonas z ON e.zona_id = z.id
      LEFT JOIN usuarios u ON t.usuario_entrada_id = u.id
      WHERE t.estado = 'activo'
      ORDER BY t.hora_entrada DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/historial
router.get('/historial', auth(), async (req, res) => {
  const { fecha, placa, limit = 50 } = req.query;
  try {
    let q = `
      SELECT t.*, e.numero as espacio_numero, z.nombre as zona_nombre,
             ue.nombre as operador_entrada, us.nombre as operador_salida,
             p.metodo_pago, p.monto as monto_pagado
      FROM tickets t
      LEFT JOIN espacios e ON t.espacio_id = e.id
      LEFT JOIN zonas z ON e.zona_id = z.id
      LEFT JOIN usuarios ue ON t.usuario_entrada_id = ue.id
      LEFT JOIN usuarios us ON t.usuario_salida_id = us.id
      LEFT JOIN pagos p ON p.ticket_id = t.id
      WHERE 1=1
    `;
    const params = [];
    if (fecha) { q += ' AND DATE(t.hora_entrada) = ?'; params.push(fecha); }
    if (placa) { q += ' AND t.placa LIKE ?'; params.push(`%${placa}%`); }
    q += ` ORDER BY t.hora_entrada DESC LIMIT ${parseInt(limit)}`;
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/buscar/:placa
router.get('/buscar/:placa', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, e.numero as espacio_numero, z.nombre as zona_nombre
      FROM tickets t
      LEFT JOIN espacios e ON t.espacio_id = e.id
      LEFT JOIN zonas z ON e.zona_id = z.id
      WHERE t.placa = ? AND t.estado = 'activo'
      ORDER BY t.hora_entrada DESC LIMIT 1
    `, [req.params.placa.toUpperCase()]);
    if (!rows.length)
      return res.status(404).json({ error: 'No se encontró ticket activo para esa placa' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/entrada - registrar entrada
router.post('/entrada', auth(), async (req, res) => {
  const { placa, tipo_vehiculo, observaciones } = req.body;
  if (!placa || !tipo_vehiculo)
    return res.status(400).json({ error: 'Placa y tipo de vehículo son requeridos' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar si ya tiene ticket activo
    const [activo] = await conn.query(
      "SELECT id FROM tickets WHERE placa=? AND estado='activo'", [placa.toUpperCase()]
    );
    if (activo.length > 0)
      return res.status(409).json({ error: 'El vehículo ya tiene un ticket activo' });

    // Buscar espacio disponible
    const [espacios] = await conn.query(
      "SELECT id, numero FROM espacios WHERE tipo=? AND estado='libre' ORDER BY numero LIMIT 1",
      [tipo_vehiculo]
    );
    if (!espacios.length)
      return res.status(400).json({ error: `No hay espacios disponibles para ${tipo_vehiculo}` });

    const espacio = espacios[0];
    const codigo = generarCodigo();

    // Crear ticket
    const [result] = await conn.query(
      `INSERT INTO tickets (codigo, placa, tipo_vehiculo, espacio_id, usuario_entrada_id, hora_entrada, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, NOW(), 'activo', ?)`,
      [codigo, placa.toUpperCase(), tipo_vehiculo, espacio.id, req.user.id, observaciones || '']
    );

    // Marcar espacio como ocupado
    await conn.query("UPDATE espacios SET estado='ocupado' WHERE id=?", [espacio.id]);

    await conn.commit();
    res.status(201).json({
      id: result.insertId,
      codigo,
      placa: placa.toUpperCase(),
      tipo_vehiculo,
      espacio_numero: espacio.numero,
      espacio_id: espacio.id,
      hora_entrada: new Date(),
      message: 'Entrada registrada exitosamente'
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PUT /api/tickets/:id/salida - registrar salida y calcular monto
router.put('/:id/salida', auth(), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [tickets] = await conn.query(
      "SELECT t.*, e.numero as espacio_numero FROM tickets t LEFT JOIN espacios e ON t.espacio_id=e.id WHERE t.id=? AND t.estado='activo'",
      [req.params.id]
    );
    if (!tickets.length)
      return res.status(404).json({ error: 'Ticket no encontrado o ya cerrado' });

    const ticket = tickets[0];
    const horaSalida = new Date();
    const horaEntrada = new Date(ticket.hora_entrada);
    const minutos = Math.floor((horaSalida - horaEntrada) / 60000);

    // Obtener tarifa
    const [tarifas] = await conn.query(
      "SELECT * FROM tarifas WHERE tipo_vehiculo=? AND modalidad='hora' AND activo=1 LIMIT 1",
      [ticket.tipo_vehiculo]
    );

    let montoBase = 0;
    let tarifaHora = 0;
    const tiempoGracia = tarifas[0]?.tiempo_gracia || 10;

    if (minutos <= tiempoGracia) {
      montoBase = 0; // dentro del tiempo de gracia
    } else if (tarifas.length > 0) {
      tarifaHora = parseFloat(tarifas[0].precio);
      const horas = Math.ceil((minutos - tiempoGracia) / 60);
      montoBase = horas * tarifaHora;
    }

    const descuento = parseFloat(req.body.descuento || 0);
    const montoCobrar = Math.max(0, montoBase - descuento);

    // Actualizar ticket
    await conn.query(`
      UPDATE tickets SET hora_salida=?, tiempo_minutos=?, tarifa_aplicada=?, monto_cobrar=?,
        descuento=?, usuario_salida_id=?, estado='cerrado' WHERE id=?`,
      [horaSalida, minutos, tarifaHora, montoCobrar, descuento, req.user.id, ticket.id]
    );

    // Liberar espacio
    await conn.query("UPDATE espacios SET estado='libre' WHERE id=?", [ticket.espacio_id]);

    await conn.commit();
    res.json({
      ticket_id: ticket.id,
      codigo: ticket.codigo,
      placa: ticket.placa,
      espacio: ticket.espacio_numero,
      hora_entrada: ticket.hora_entrada,
      hora_salida: horaSalida,
      tiempo_minutos: minutos,
      tarifa_hora: tarifaHora,
      monto_base: montoBase,
      descuento,
      monto_cobrar: montoCobrar,
      message: 'Salida registrada'
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
