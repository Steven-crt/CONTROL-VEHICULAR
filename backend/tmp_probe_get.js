const BASE = 'http://localhost:3011/api';
const mysql = require('mysql2/promise');
(async () => {
  const adm = await (await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'test_admin', password: 'test1234' }) })).json();
  const hA = { Authorization: 'Bearer ' + adm.token };
  for (const qs of ['', '?estado=Surtida', '?estado=Pendiente', '?limit=200']) {
    const r = await fetch(BASE + '/combustible' + qs, { headers: hA });
    const j = await r.json();
    console.log('GET /combustible' + (qs || ' (sin filtros)'), '->', r.status, Array.isArray(j) ? j.length + ' filas' : JSON.stringify(j));
  }
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test' });
  const [rows] = await c.query("SELECT COUNT(*) n FROM solicitudes_combustible c JOIN vehiculos v ON c.vehiculo_id=v.id WHERE c.estado='Pendiente'");
  console.log('SQL directo con JOIN:', rows[0].n);
  await c.end();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
