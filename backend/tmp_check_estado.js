const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test' });
  const [s] = await c.query("SELECT id, estado, HEX(estado) hx, solicitante_id, fecha_solicitud FROM solicitudes_combustible ORDER BY id DESC LIMIT 5");
  console.log('COMBUSTIBLE ultimas:', JSON.stringify(s));
  const [m] = await c.query("SELECT id, estado, HEX(estado) hx, solicitante_id, fecha_realizada FROM mantenimientos ORDER BY id DESC LIMIT 5");
  console.log('MANTENIMIENTOS ultimos:', JSON.stringify(m));
  const [cols] = await c.query("SHOW COLUMNS FROM solicitudes_combustible LIKE 'estado'");
  console.log('COL estado comb:', JSON.stringify(cols));
  const [cnt] = await c.query("SELECT estado, COUNT(*) n FROM solicitudes_combustible GROUP BY estado");
  console.log('CONTEO por estado:', JSON.stringify(cnt));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
