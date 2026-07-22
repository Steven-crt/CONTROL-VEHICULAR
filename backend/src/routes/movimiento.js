const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// POST /api/movimiento/calcular - Calcular consumo en un período
router.post('/calcular', auth(), async (req, res) => {
  const { vehiculo_id, fecha_inicio, fecha_fin } = req.body;
  
  if (!vehiculo_id || !fecha_inicio || !fecha_fin)
    return res.status(400).json({ error: 'vehiculo_id, fecha_inicio y fecha_fin son requeridos' });
  
  try {
    // 1. Verificar que el vehículo existe
    const [vehiculo] = await db.query('SELECT * FROM vehiculos WHERE id = ?', [vehiculo_id]);
    if (!vehiculo.length)
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    
    const v = vehiculo[0];
    
    // 2. Buscar cargas de combustible EN el período
    const [cargasPeriodo] = await db.query(`
      SELECT * FROM combustible 
      WHERE vehiculo_id = ? 
        AND fecha_carga >= ? 
        AND fecha_carga <= ?
      ORDER BY fecha_carga ASC
    `, [vehiculo_id, fecha_inicio, fecha_fin + ' 23:59:59']);
    
    // 3. Buscar TODAS las cargas anteriores (para promedios históricos)
    const [cargasHistoricas] = await db.query(`
      SELECT * FROM combustible 
      WHERE vehiculo_id = ?
      ORDER BY fecha_carga ASC
    `, [vehiculo_id]);
    
    // 4. Buscar kilometrajes manuales en el período
    const [kmManualPeriodo] = await db.query(`
      SELECT * FROM kilometraje_manual 
      WHERE vehiculo_id = ?
        AND fecha_registro >= ?
        AND fecha_registro <= ?
      ORDER BY fecha_registro ASC
    `, [vehiculo_id, fecha_inicio, fecha_fin + ' 23:59:59']);
    
    // 5. Determinar KM inicial del período
    // Si hay cargas en el período, usar la primera
    // Si no, buscar la carga más cercana anterior o el kilometraje manual
    let kmInicial = 0;
    let kmFinal = 0;
    let kmInicialFuente = 'ninguno';
    let kmFinalFuente = 'ninguno';
    
    if (cargasPeriodo.length > 0) {
      // Primera carga del período
      kmInicial = parseInt(cargasPeriodo[0].km_actual);
      kmInicialFuente = 'combustible_inicio';
      
      // Última carga del período
      kmFinal = parseInt(cargasPeriodo[cargasPeriodo.length - 1].km_actual);
      kmFinalFuente = 'combustible_fin';
      
      // Buscar KM de carga ANTERIOR a la primera del período
      const [cargaAnterior] = await db.query(`
        SELECT km_actual FROM combustible 
        WHERE vehiculo_id = ? AND fecha_carga < ?
        ORDER BY fecha_carga DESC LIMIT 1
      `, [vehiculo_id, cargasPeriodo[0].fecha_carga]);
      
      if (cargaAnterior.length > 0) {
        kmInicial = parseInt(cargaAnterior[0].km_actual);
        kmInicialFuente = 'carga_anterior';
      }
    }
    
    // Si no hay cargas en el período, usar kilometrajes manuales
    if (cargasPeriodo.length === 0) {
      // Buscar km manual en período
      if (kmManualPeriodo.length > 0) {
        kmInicial = parseInt(kmManualPeriodo[0].km_actual);
        kmFinal = parseInt(kmManualPeriodo[kmManualPeriodo.length - 1].km_actual);
        kmInicialFuente = 'km_manual';
        kmFinalFuente = 'km_manual';
      } else {
        // Buscar el registro de KM más cercano antes del período
        const [kmAntes] = await db.query(`
          SELECT km_actual, fecha_carga as fecha FROM combustible 
          WHERE vehiculo_id = ? AND fecha_carga < ?
          ORDER BY fecha_carga DESC LIMIT 1
        `, [vehiculo_id, fecha_inicio]);
        
        const [kmManualAntes] = await db.query(`
          SELECT km_actual, fecha_registro as fecha FROM kilometraje_manual 
          WHERE vehiculo_id = ? AND fecha_registro < ?
          ORDER BY fecha_registro DESC LIMIT 1
        `, [vehiculo_id, fecha_inicio]);
        
        let mejorInicio = null;
        let mejorInicioFecha = null;
        
        if (kmAntes.length) {
          mejorInicio = parseInt(kmAntes[0].km_actual);
          mejorInicioFecha = kmAntes[0].fecha;
        }
        if (kmManualAntes.length && (!mejorInicioFecha || new Date(kmManualAntes[0].fecha) > new Date(mejorInicioFecha))) {
          mejorInicio = parseInt(kmManualAntes[0].km_actual);
          mejorInicioFecha = kmManualAntes[0].fecha;
        }
        
        if (mejorInicio !== null) {
          kmInicial = mejorInicio;
          kmInicialFuente = 'registro_cercano';
        }
        
        // Buscar el km más cercano después del período
        const [kmDespues] = await db.query(`
          SELECT km_actual, fecha_carga as fecha FROM combustible 
          WHERE vehiculo_id = ? AND fecha_carga > ?
          ORDER BY fecha_carga ASC LIMIT 1
        `, [vehiculo_id, fecha_fin]);
        
        const [kmManualDespues] = await db.query(`
          SELECT km_actual, fecha_registro as fecha FROM kilometraje_manual 
          WHERE vehiculo_id = ? AND fecha_registro > ?
          ORDER BY fecha_registro ASC LIMIT 1
        `, [vehiculo_id, fecha_fin]);
        
        let mejorFin = null;
        let mejorFinFecha = null;
        
        if (kmDespues.length) {
          mejorFin = parseInt(kmDespues[0].km_actual);
          mejorFinFecha = kmDespues[0].fecha;
        }
        if (kmManualDespues.length && (!mejorFinFecha || new Date(kmManualDespues[0].fecha) < new Date(mejorFinFecha))) {
          mejorFin = parseInt(kmManualDespues[0].km_actual);
          mejorFinFecha = kmManualDespues[0].fecha;
        }
        
        if (mejorFin !== null) {
          kmFinal = mejorFin;
          kmFinalFuente = 'registro_cercano';
        }
      }
    }
    
    // 6. Calcular métricas del período
    const kmRecorridos = Math.max(0, kmFinal - kmInicial);
    const totalLitros = cargasPeriodo.reduce((sum, c) => sum + parseFloat(c.litros), 0);
    const gastoTotal = cargasPeriodo.reduce((sum, c) => sum + parseFloat(c.costo_total), 0);
    const numCargas = cargasPeriodo.length;
    
    // Consumo promedio (L/100km)
    let consumoPromedio = null;
    if (totalLitros > 0 && kmRecorridos > 0) {
      consumoPromedio = parseFloat(((totalLitros / kmRecorridos) * 100).toFixed(2));
    }
    
    // 7. Calcular promedio histórico total del vehículo
    const totalLitrosHist = cargasHistoricas.reduce((sum, c) => sum + parseFloat(c.litros), 0);
    const kmInicialHist = cargasHistoricas.length > 0 ? parseInt(cargasHistoricas[0].km_actual) : 0;
    const kmFinalHist = cargasHistoricas.length > 0 ? parseInt(cargasHistoricas[cargasHistoricas.length - 1].km_actual) : 0;
    const kmRecorridosHist = Math.max(0, kmFinalHist - kmInicialHist);
    
    let consumoHistorico = null;
    if (totalLitrosHist > 0 && kmRecorridosHist > 0) {
      consumoHistorico = parseFloat(((totalLitrosHist / kmRecorridosHist) * 100).toFixed(2));
    }
    
    // 8. Comparativa y alerta
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
    
    // 9. Datos para gráfico (consumo por carga en el período)
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
    
    // 10. Últimos 5 movimientos del vehículo (cargas + mantenimientos)
    const [ultimosCombustible] = await db.query(`
      SELECT fecha_carga as fecha, litros, costo_total as monto, 'combustible' as tipo
      FROM combustible WHERE vehiculo_id = ?
      ORDER BY fecha_carga DESC LIMIT 5
    `, [vehiculo_id]);
    
    const [ultimosMantenimiento] = await db.query(`
      SELECT fecha, NULL as litros, costo as monto, CONCAT('mantenimiento - ', tipo_servicio) as tipo
      FROM mantenimiento WHERE vehiculo_id = ?
      ORDER BY fecha DESC LIMIT 5
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
          ? parseFloat((cargasPeriodo.reduce((s, c) => s + parseFloat(c.costo_total), 0) / cargasPeriodo.reduce((s, c) => s + parseFloat(c.litros), 0)).toFixed(4))
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
    console.error('Error en POST /movimiento/calcular:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
