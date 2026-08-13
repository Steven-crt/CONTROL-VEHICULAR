const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// NOTA: Para escalabilidad, las queries se pueden optimizar con CTEs en MySQL 8+ o usando tablas temporales
// Aquí mantengo compatibilidad con MySQL 5.7+ pero preparado para migración futura

router.get('/', auth(), async (req, res) => {
  try {
    const notificaciones = [];

    // 1. Vehículos con bajo rendimiento de combustible (< 8 km/l)
    // Optimización: usar una subquery escalonada para calcular el KM previo
    const [bajoRendimiento] = await db.query(`
      SELECT c.vehiculo_id, v.placa, v.marca, v.modelo,
        ROUND(AVG(
          CASE
            WHEN c.kilometraje_actual > 0 AND c.galones_surtidos > 0 THEN
              (c.kilometraje_actual - COALESCE(
                (SELECT c2.kilometraje_actual
                 FROM solicitudes_combustible c2
                 WHERE c2.vehiculo_id = c.vehiculo_id
                   AND c2.fecha_solicitud < c.fecha_solicitud
                 ORDER BY c2.fecha_solicitud DESC LIMIT 1),
                0
              )) / c.galones_surtidos
            ELSE 0
          END
        ), 2) as rendimiento
      FROM solicitudes_combustible c
      JOIN vehiculos v ON c.vehiculo_id = v.id
      WHERE c.kilometraje_actual > 0 AND c.galones_surtidos > 0
      GROUP BY c.vehiculo_id
      HAVING rendimiento < 8 AND rendimiento > 0
      ORDER BY rendimiento ASC
      LIMIT 5
    `);
    bajoRendimiento.forEach(v => {
      notificaciones.push({
        tipo: 'warning',
        icono: 'fuel',
        titulo: 'Rendimiento bajo',
        mensaje: `${v.placa} (${v.marca} ${v.modelo}) — ${v.rendimiento} km/l`,
        link: `/vehiculos/${v.vehiculo_id}`
      });
    });

    // 2. Vehículos sin carga de combustible en los últimos 30 días
    const [sinCarga] = await db.query(`
      SELECT v.id, v.placa, v.marca, v.modelo,
        DATEDIFF(NOW(), COALESCE(MAX(c.fecha_solicitud), v.created_at)) as dias
      FROM vehiculos v
      LEFT JOIN solicitudes_combustible c ON v.id = c.vehiculo_id
      WHERE v.activo = 1
      GROUP BY v.id
      HAVING dias >= 30
      ORDER BY dias DESC
      LIMIT 5
    `);
    sinCarga.forEach(v => {
      notificaciones.push({
        tipo: 'info',
        icono: 'alert',
        titulo: 'Sin carga de combustible',
        mensaje: `${v.placa} (${v.marca} ${v.modelo}) — ${v.dias} días`,
        link: `/vehiculos/${v.id}`
      });
    });

    // 3. Mantenimientos preventivos próximos (km cercano al intervalo)
    // Optimización: usar una sola subquery para obtener el último KM de mantenimiento por vehículo
    const [config] = await db.query(`SELECT valor FROM configuracion WHERE clave = 'intervalo_mant_km'`);
    const intervaloKm = parseInt(config[0]?.valor) || 5000;
    const [mantenciones] = await db.query(`
      SELECT v.id, v.placa, v.marca, v.modelo,
        v.kilometraje_actual as km_actual,
        COALESCE(m.max_km, 0) as ultimo_km_mant
      FROM vehiculos v
      LEFT JOIN (
        SELECT vehiculo_id, MAX(kilometraje_realizado) as max_km
        FROM mantenimientos
        GROUP BY vehiculo_id
      ) m ON m.vehiculo_id = v.id
      WHERE v.activo = 1 AND v.kilometraje_actual > 0
        AND (v.kilometraje_actual - COALESCE(m.max_km, 0)) >= (? * 0.8)
      ORDER BY (v.kilometraje_actual - COALESCE(m.max_km, 0)) DESC
      LIMIT 5
    `, [intervaloKm]);
    mantenciones.forEach(v => {
      const kmRestante = intervaloKm - (v.km_actual - v.ultimo_km_mant);
      notificaciones.push({
        tipo: 'warning',
        icono: 'wrench',
        titulo: 'Mantenimiento próximo',
        mensaje: `${v.placa} — faltan ${kmRestante > 0 ? kmRestante : 0} km para el servicio`,
        link: `/vehiculos/${v.id}`
      });
    });

    // 4. SOAT: vencidos, por vencer y sin datos registrados
    const [soatVehiculos] = await db.query(`
      SELECT id, placa, marca, modelo, soat_numero, soat_empresa, soat_fecha_vencimiento,
        DATEDIFF(soat_fecha_vencimiento, CURDATE()) as dias_restantes
      FROM vehiculos
      WHERE soat_fecha_vencimiento IS NOT NULL AND activo = 1
      ORDER BY dias_restantes ASC
      LIMIT 10
    `);
    soatVehiculos.forEach(v => {
      if (v.dias_restantes < 0) {
        notificaciones.push({
          tipo: 'warning',
          icono: 'alert',
          titulo: 'SOAT vencido',
          mensaje: `${v.placa} — venció el ${String(v.soat_fecha_vencimiento).slice(0, 10)}`,
          link: `/vehiculos/${v.id}`
        });
      } else if (v.dias_restantes <= 30) {
        notificaciones.push({
          tipo: 'warning',
          icono: 'alert',
          titulo: 'SOAT por vencer',
          mensaje: `${v.placa} — vence en ${v.dias_restantes} día${v.dias_restantes !== 1 ? 's' : ''}`,
          link: `/vehiculos/${v.id}`
        });
      }
    });

    const [sinSoat] = await db.query(`
      SELECT id, placa, marca, modelo
      FROM vehiculos
      WHERE (soat_numero IS NULL OR soat_numero = '' OR soat_fecha_vencimiento IS NULL) AND activo = 1
      ORDER BY placa ASC
      LIMIT 5
    `);
    sinSoat.forEach(v => {
      notificaciones.push({
        tipo: 'warning',
        icono: 'alert',
        titulo: 'Sin datos de SOAT',
        mensaje: `${v.placa} — registre los datos del SOAT`,
        link: `/vehiculos/${v.id}`
      });
    });

    // 5. Total vehículos en flota
    const [totalVeh] = await db.query('SELECT COUNT(*) as total FROM vehiculos WHERE activo = 1');
    notificaciones.push({
      tipo: 'info',
      icono: 'car',
      titulo: 'Flota total',
      mensaje: `${totalVeh[0].total} vehículos registrados`,
      link: '/vehiculos'
    });

    // 6. Gastos del mes
    const [gastoCombustible] = await db.query(
      "SELECT COALESCE(SUM(costo_total),0) as total FROM solicitudes_combustible WHERE MONTH(fecha_solicitud)=MONTH(CURDATE()) AND YEAR(fecha_solicitud)=YEAR(CURDATE())"
    );
    const [gastoMant] = await db.query(
      "SELECT COALESCE(SUM(costo),0) as total FROM mantenimientos WHERE MONTH(fecha_realizada)=MONTH(CURDATE()) AND YEAR(fecha_realizada)=YEAR(CURDATE())"
    );
    const totalMes = parseFloat(gastoCombustible[0].total) + parseFloat(gastoMant[0].total);
    notificaciones.push({
      tipo: 'info',
      icono: 'dollar',
      titulo: 'Gastos del mes',
      mensaje: `$${totalMes.toFixed(2)} en combustible y mantenimiento`,
      link: '/reportes'
    });

    res.json(notificaciones);
  } catch (err) {
    console.error('Error en GET /notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
