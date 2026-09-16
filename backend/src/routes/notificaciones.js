const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { internalError } = require('../utils/httpErrors');

const INICIO_MES = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";

function mesActual() { return new Date().toISOString().slice(0, 7); }

router.get('/', auth(), async (req, res) => {
  const MES = mesActual();
  try {
    const notificaciones = [];
    const push = (clave, tipo, icono, titulo, mensaje, link) =>
      notificaciones.push({ clave, tipo, icono, titulo, mensaje, link });

    
    const [bajoRendimiento] = await db.query(`
      WITH historial_km AS (
        SELECT id, vehiculo_id, fecha_solicitud, kilometraje_actual, galones_surtidos,
          LAG(kilometraje_actual) OVER (PARTITION BY vehiculo_id ORDER BY fecha_solicitud, id) AS km_anterior
        FROM solicitudes_combustible
        WHERE kilometraje_actual > 0 AND galones_surtidos > 0
      )
      SELECT c.vehiculo_id, v.placa, v.marca, v.modelo,
        ROUND(AVG(
          CASE
            WHEN c.km_anterior IS NOT NULL AND c.kilometraje_actual > c.km_anterior THEN
              (c.kilometraje_actual - c.km_anterior) / c.galones_surtidos
            ELSE NULL
          END
        ), 2) as rendimiento
      FROM historial_km c
      JOIN vehiculos v ON c.vehiculo_id = v.id
      GROUP BY c.vehiculo_id
      HAVING rendimiento IS NOT NULL AND rendimiento < 8
      ORDER BY rendimiento ASC
      LIMIT 5
    `);
    bajoRendimiento.forEach(v => {
      push(`rb:${v.vehiculo_id}:${MES}`, 'warning', 'fuel', 'Rendimiento bajo',
        `${v.placa} (${v.marca} ${v.modelo}) — ${v.rendimiento} km/l`, `/vehiculos/${v.vehiculo_id}`);
    });

    // 2. Vehículos sin carga de combustible en los últimos 30 dias 
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
      push(`sc:${v.id}:${MES}`, 'info', 'alert', 'Sin carga de combustible',
        `${v.placa} (${v.marca} ${v.modelo}) — ${v.dias} días`, `/vehiculos/${v.id}`);
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
      push(`mp:${v.id}:${MES}`, 'warning', 'wrench', 'Mantenimiento próximo',
        `${v.placa} — faltan ${kmRestante > 0 ? kmRestante : 0} km para el servicio`, `/vehiculos/${v.id}`);
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
        push(`soat_v:${v.id}:${new Date().getFullYear()}`, 'warning', 'alert', 'SOAT vencido',
          `${v.placa} — venció el ${String(v.soat_fecha_vencimiento).slice(0, 10)}`, `/vehiculos/${v.id}`);
      } else if (v.dias_restantes <= 30) {
        push(`soat_p:${v.id}:${MES}`, 'warning', 'alert', 'SOAT por vencer',
          `${v.placa} — vence en ${v.dias_restantes} día${v.dias_restantes !== 1 ? 's' : ''}`, `/vehiculos/${v.id}`);
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
      push(`ss:${v.id}:${MES}`, 'warning', 'alert', 'Sin datos de SOAT',
        `${v.placa} — registre los datos del SOAT`, `/vehiculos/${v.id}`);
    });

    // 5. Solicitudes pendientes de aprobación (solo admins): combustible,
    //    mantenimiento y anomalías abiertas creadas por empleados.
    if (req.user?.rol === 'admin') {
      const [pendientes] = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM solicitudes_combustible WHERE estado = 'Pendiente') as comb,
          (SELECT COUNT(*) FROM mantenimientos WHERE estado = 'Pendiente') as mant
      `);
      const { comb, mant } = pendientes[0];
      const totalPend = Number(comb) + Number(mant);
      if (totalPend > 0) {
        push(`pend:${MES}`, 'warning', 'dollar', 'Solicitudes por atender',
          `${comb} carga${comb !== 1 ? 's' : ''} de combustible y ${mant} mantenimiento${mant !== 1 ? 's' : ''} esperan aprobación`,
          '/historia');
      }
    }

    // Filtrar las que este usuario ya marcó como vistas
    const [vistas] = await db.query(
      'SELECT clave FROM notificaciones_vistas WHERE usuario_id = ?',
      [req.user?.id || 0]
    );
    const vistasSet = new Set(vistas.map(v => v.clave));
    const visibles = notificaciones.filter(n => !vistasSet.has(n.clave));

    res.json(visibles);
  } catch (err) {
    internalError(res, err, 'notificaciones');
  }
});

// POST /api/notificaciones/vista  { claves: ['rb:1:2026-08', ...] }
// Marca alertas como vistas para el usuario actual (dejan de aparecer).
router.post('/vista', auth(), async (req, res) => {
  try {
    const claves = Array.isArray(req.body?.claves) ? req.body.claves.filter(c => typeof c === 'string').slice(0, 100) : [];
    if (!claves.length) return res.json({ ok: true, marcadas: 0 });
    const values = claves.map(c => [req.user.id, c.slice(0, 120)]);
    await db.query('INSERT IGNORE INTO notificaciones_vistas (usuario_id, clave) VALUES ?', [values]);
    // Limpieza oportunista: las marcas viejas (>90 días) ya no sirven
    await db.query('DELETE FROM notificaciones_vistas WHERE created_at < NOW() - INTERVAL 90 DAY');
    res.json({ ok: true, marcadas: values.length });
  } catch (err) {
    internalError(res, err, 'notificaciones/vista');
  }
});

module.exports = router;
