const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');
const { intId, date, body } = require('../utils/validate');

// POST /api/movimiento/calcular - Calcular consumo en un período
router.post('/calcular', auth(), async (req, res) => {
  const validado = body({
    vehiculo_id: [intId, { label: 'vehiculo_id' }],
    fecha_inicio: [date, { required: true, label: 'fecha_inicio' }],
    fecha_fin: [date, { required: true, label: 'fecha_fin' }]
  }, req.body);
  if (!validado.ok) return res.status(400).json({ error: validado.error });
  const { vehiculo_id, fecha_inicio, fecha_fin } = validado.values;

  if (fecha_inicio > fecha_fin)
    return res.status(400).json({ error: 'fecha_inicio no puede ser posterior a fecha_fin' });

  try {
    // 1. Verificar que el vehículo existe
    const [vehiculo] = await db.query(
      `SELECT v.*, LOWER(COALESCE(tv.nombre, 'Camioneta')) AS tipo
       FROM vehiculos v
       LEFT JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
       WHERE v.id = ?`,
      [vehiculo_id]
    );
    if (!vehiculo.length)
      return res.status(404).json({ error: 'Vehículo no encontrado' });

    const v = vehiculo[0];

    const CARGA_SELECT = `SELECT c.fecha_solicitud AS fecha_carga, c.galones_surtidos AS litros, c.costo_total, c.kilometraje_actual AS km_actual FROM solicitudes_combustible c`;

    // 2. Buscar cargas de combustible EN el período
    const [cargasPeriodo] = await db.query(
      `${CARGA_SELECT} WHERE c.vehiculo_id = ? AND c.fecha_solicitud >= ? AND c.fecha_solicitud <= ? ORDER BY c.fecha_solicitud ASC`,
      [vehiculo_id, fecha_inicio, fecha_fin + ' 23:59:59']
    );

    // 3. Buscar TODAS las cargas anteriores (para promedios históricos)
    const [cargasHistoricas] = await db.query(
      `${CARGA_SELECT} WHERE c.vehiculo_id = ? ORDER BY c.fecha_solicitud ASC`,
      [vehiculo_id]
    );

    // 4. Determinar KM inicial y final del período
    let kmInicial = 0;
    let kmFinal = 0;
    let kmInicialFuente = 'ninguno';
    let kmFinalFuente = 'ninguno';

    if (cargasPeriodo.length > 0) {
      kmInicial = parseInt(cargasPeriodo[0].km_actual);
      kmInicialFuente = 'combustible_inicio';

      kmFinal = parseInt(cargasPeriodo[cargasPeriodo.length - 1].km_actual);
      kmFinalFuente = 'combustible_fin';

      const [cargaAnterior] = await db.query(
        `${CARGA_SELECT} WHERE c.vehiculo_id = ? AND c.fecha_solicitud < ? ORDER BY c.fecha_solicitud DESC LIMIT 1`,
        [vehiculo_id, cargasPeriodo[0].fecha_carga]
      );

      if (cargaAnterior.length > 0) {
        kmInicial = parseInt(cargaAnterior[0].km_actual);
        kmInicialFuente = 'carga_anterior';
      }
    }

    // Sin cargas en el período: usar registro más cercano antes/después o el km del vehículo
    if (cargasPeriodo.length === 0) {
      const [kmAntes] = await db.query(
        `${CARGA_SELECT} WHERE c.vehiculo_id = ? AND c.fecha_solicitud < ? ORDER BY c.fecha_solicitud DESC LIMIT 1`,
        [vehiculo_id, fecha_inicio]
      );

      if (kmAntes.length > 0) {
        kmInicial = parseInt(kmAntes[0].km_actual);
        kmInicialFuente = 'registro_cercano';
      }

      const [kmDespues] = await db.query(
        `${CARGA_SELECT} WHERE c.vehiculo_id = ? AND c.fecha_solicitud > ? ORDER BY c.fecha_solicitud ASC LIMIT 1`,
        [vehiculo_id, fecha_fin]
      );

      if (kmDespues.length > 0) {
        kmFinal = parseInt(kmDespues[0].km_actual);
        kmFinalFuente = 'registro_cercano';
      } else if (parseFloat(v.kilometraje_actual) > 0) {
        kmFinal = parseFloat(v.kilometraje_actual);
        kmFinalFuente = 'vehiculo';
      }
    }

    // 5. Calcular métricas del período
    const kmRecorridos = Math.max(0, kmFinal - kmInicial);
    const totalLitros = cargasPeriodo.reduce((sum, c) => sum + parseFloat(c.litros || 0), 0);
    const gastoTotal = cargasPeriodo.reduce((sum, c) => sum + parseFloat(c.costo_total || 0), 0);
    const numCargas = cargasPeriodo.length;

    let consumoPromedio = null;
    if (totalLitros > 0 && kmRecorridos > 0) {
      consumoPromedio = parseFloat(((totalLitros / kmRecorridos) * 100).toFixed(2));
    }

    // 6. Calcular promedio histórico total del vehículo
    const totalLitrosHist = cargasHistoricas.reduce((sum, c) => sum + parseFloat(c.litros || 0), 0);
    const kmInicialHist = cargasHistoricas.length > 0 ? parseInt(cargasHistoricas[0].km_actual) : 0;
    const kmFinalHist = cargasHistoricas.length > 0 ? parseInt(cargasHistoricas[cargasHistoricas.length - 1].km_actual) : 0;
    const kmRecorridosHist = Math.max(0, kmFinalHist - kmInicialHist);

    let consumoHistorico = null;
    if (totalLitrosHist > 0 && kmRecorridosHist > 0) {
      consumoHistorico = parseFloat(((totalLitrosHist / kmRecorridosHist) * 100).toFixed(2));
    }

    // 7. Comparativa y alerta
    let alerta = null;
    let diferenciaPorcentual = null;

    if (consumoPromedio !== null && consumoHistorico !== null && consumoHistorico > 0) {
      diferenciaPorcentual = parseFloat(
        (((consumoPromedio - consumoHistorico) / consumoHistorico) * 100).toFixed(2)
      );

      if (diferenciaPorcentual > 15) {
        alerta = {
          tipo: 'peligro',
          mensaje: '¡Posible fuga o problema mecánico! Consumo elevado.',
          detalle: `El consumo actual (${consumoPromedio} L/100km) es ${diferenciaPorcentual}% mayor al histórico (${consumoHistorico} L/100km).`
        };
      } else if (diferenciaPorcentual > 5) {
        alerta = {
          tipo: 'advertencia',
          mensaje: 'Consumo ligeramente elevado. Monitorear.',
          detalle: `El consumo actual (${consumoPromedio} L/100km) es ${diferenciaPorcentual}% mayor al histórico (${consumoHistorico} L/100km).`
        };
      }
    }

    // 8. Datos para gráfico (consumo por carga en el período)
    const consumoPorCarga = cargasPeriodo.map((c, i, arr) => {
      const kmAnterior = i > 0 ? parseInt(arr[i - 1].km_actual) : kmInicial;
      const kmRec = c.km_actual - kmAnterior;
      const rend = c.litros > 0 && kmRec > 0 ? parseFloat((kmRec / c.litros).toFixed(2)) : null;
      const consumoL100 = c.litros > 0 && kmRec > 0
        ? parseFloat(((c.litros / kmRec) * 100).toFixed(2))
        : null;

      return {
        fecha: c.fecha_carga,
        km_actual: c.km_actual,
        litros: parseFloat(c.litros),
        costo: parseFloat(c.costo_total),
        rendimiento_kmL: rend,
        consumo_l100km: consumoL100
      };
    });

    // 9. Últimos 5 movimientos del vehículo (cargas + mantenimientos)
    const [ultimosCombustible] = await db.query(`
      SELECT c.fecha_solicitud as fecha, c.galones_surtidos as litros, c.costo_total as monto, 'combustible' as tipo
      FROM solicitudes_combustible c WHERE c.vehiculo_id = ?
      ORDER BY c.fecha_solicitud DESC LIMIT 5
    `, [vehiculo_id]);

    const [ultimosMantenimiento] = await db.query(`
      SELECT m.fecha_realizada as fecha, NULL as litros, m.costo as monto, CONCAT('mantenimiento - ', m.tipo_servicio) as tipo
      FROM mantenimientos m WHERE m.vehiculo_id = ?
      ORDER BY m.fecha_realizada DESC LIMIT 5
    `, [vehiculo_id]);

    const ultimosMovimientos = [...ultimosCombustible, ...ultimosMantenimiento]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 10);

    res.json({
      vehiculo: {
        id: v.id,
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
        tipo: v.tipo,
        color: v.color
      },
      periodo: {
        inicio: fecha_inicio,
        fin: fecha_fin
      },
      km: {
        inicial: kmInicial,
        final: kmFinal,
        recorridos: kmRecorridos,
        fuente_inicial: kmInicialFuente,
        fuente_final: kmFinalFuente
      },
      combustible: {
        cargas: numCargas,
        total_litros: parseFloat(totalLitros.toFixed(2)),
        gasto_total: parseFloat(gastoTotal.toFixed(2)),
        precio_promedio: numCargas > 0
          ? parseFloat((cargasPeriodo.reduce((s, c) => s + parseFloat(c.costo_total || 0), 0) / totalLitros).toFixed(4))
          : 0
      },
      consumo: {
        promedio_l100km: consumoPromedio,
        historico_l100km: consumoHistorico,
        diferencia_porcentual: diferenciaPorcentual,
        alerta
      },
      consumo_por_carga: consumoPorCarga,
      ultimos_movimientos: ultimosMovimientos
    });

  } catch (err) {
    internalError(res, err, 'movimiento/calcular');
  }
});

module.exports = router;
