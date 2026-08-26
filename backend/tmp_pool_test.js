process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3309';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '160507';
process.env.DB_NAME = 'control_vehicular_test';
process.env.DB_SSL = 'false';
const db = require('./src/db');
const CARGA_SELECT = `
  WITH historial_km AS (
    SELECT id, vehiculo_id, fecha_solicitud, kilometraje_actual,
      LAG(kilometraje_actual) OVER (PARTITION BY vehiculo_id ORDER BY fecha_solicitud, id) AS km_anterior
    FROM solicitudes_combustible
  )
  SELECT c.id, c.codigo, c.estado, v.placa
  FROM solicitudes_combustible c
  JOIN vehiculos v ON c.vehiculo_id = v.id
  LEFT JOIN historial_km hk ON hk.id = c.id
`;
(async () => {
  await new Promise(r => setTimeout(r, 1500));
  const q = `${CARGA_SELECT} WHERE 1=1 AND c.estado = ? ORDER BY c.fecha_solicitud DESC LIMIT ?`;
  const [rows] = await db.query(q, ['Pendiente', 50]);
  console.log('VIA POOL filas:', rows.length);
  const [todos] = await db.query(`${CARGA_SELECT} WHERE 1=1 ORDER BY c.fecha_solicitud DESC LIMIT ?`, [200]);
  console.log('VIA POOL sin filtro:', todos.length);
  process.exit(0);
})().catch(e => { console.error('FATAL', e.code, e.message.slice(0, 300)); process.exit(1); });
