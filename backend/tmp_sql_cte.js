const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test' });
  const [v] = await c.query('SELECT VERSION() v');
  console.log('VERSION:', v[0].v);
  const sql = `
  WITH historial_km AS (
    SELECT id, vehiculo_id, fecha_solicitud, kilometraje_actual,
      LAG(kilometraje_actual) OVER (PARTITION BY vehiculo_id ORDER BY fecha_solicitud, id) AS km_anterior
    FROM solicitudes_combustible
  )
  SELECT c.id, c.codigo, v.placa, c.estado
  FROM solicitudes_combustible c
  JOIN vehiculos v ON c.vehiculo_id = v.id
  LEFT JOIN historial_km hk ON hk.id = c.id
  WHERE 1=1 AND c.estado = ?
  ORDER BY c.fecha_solicitud DESC
  LIMIT ?`;
  try {
    const [rows] = await c.query(sql, ['Pendiente', 50]);
    console.log('CTE query filas:', rows.length, JSON.stringify(rows.slice(0, 3)));
  } catch (e) {
    console.log('CTE query ERROR:', e.code, e.message.slice(0, 300));
  }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
