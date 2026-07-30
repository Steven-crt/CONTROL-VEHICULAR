const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth(), async (req, res) => {
  try {
    const notificaciones = [];

    // 1. Vehículos con bajo rendimiento de combustible (< 8 km/l)
    const [bajoRendimiento] = await db.query(`
      SELECT c.vehiculo_id, v.placa, v.marca, v.modelo,
        ROUND(AVG((c.km_actual - COALESCE(
          (SELECT km_actual FROM combustible c2 WHERE c2.vehiculo_id = c.vehiculo_id AND c2.fecha_carga < c.fecha_carga ORDER BY c2.fecha_carga DESC LIMIT 1),
          0
        )) / c.litros), 2) as rendimiento
      FROM combustible c
      JOIN vehiculos v ON c.vehiculo_id = v.id
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
        DATEDIFF(NOW(), COALESCE(MAX(c.fecha_carga), v.created_at)) as dias
      FROM vehiculos v
      LEFT JOIN combustible c ON v.id = c.vehiculo_id
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
    const [config] = await db.query(`SELECT valor FROM configuracion WHERE clave = 'intervalo_mant_km'`);
    const intervaloKm = parseInt(config[0]?.valor) || 5000;
    const [mantenciones] = await db.query(`
      SELECT v.id, v.placa, v.marca, v.modelo,
        COALESCE(
          (SELECT km_actual FROM combustible WHERE vehiculo_id = v.id ORDER BY fecha_carga DESC LIMIT 1),
          (SELECT km_actual FROM kilometraje_manual WHERE vehiculo_id = v.id ORDER BY fecha_registro DESC LIMIT 1),
          0
        ) as km_actual,
        COALESCE(
          (SELECT MAX(km_actual) FROM mantenimiento WHERE vehiculo_id = v.id),
          0
        ) as ultimo_km_mant
      FROM vehiculos v
      HAVING km_actual > 0 AND (km_actual - ultimo_km_mant) >= (? * 0.8)
      ORDER BY (km_actual - ultimo_km_mant) DESC
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

    // 4. Total vehículos en flota
    const [totalVeh] = await db.query('SELECT COUNT(*) as total FROM vehiculos');
    notificaciones.push({
      tipo: 'info',
      icono: 'car',
      titulo: 'Flota total',
      mensaje: `${totalVeh[0].total} vehículos registrados`,
      link: '/vehiculos'
    });

    // 5. Gastos del mes
    const [gastoCombustible] = await db.query(
      "SELECT COALESCE(SUM(costo_total),0) as total FROM combustible WHERE MONTH(fecha_carga)=MONTH(CURDATE()) AND YEAR(fecha_carga)=YEAR(CURDATE())"
    );
    const [gastoMant] = await db.query(
      "SELECT COALESCE(SUM(costo),0) as total FROM mantenimiento WHERE MONTH(fecha)=MONTH(CURDATE()) AND YEAR(fecha)=YEAR(CURDATE())"
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
