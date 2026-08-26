const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test'
  });
  const [rows] = await conn.query('SELECT id, username, password, rol_id, activo FROM usuarios');
  for (const u of rows) {
    let ok = false;
    try { ok = await bcrypt.compare('test1234', String(u.password || '')); } catch (e) { ok = 'ERR:' + e.message; }
    console.log(`id=${u.id} user=${u.username} rol_id=${u.rol_id} activo=${u.activo} pass_len=${String(u.password||'').length} match_test1234=${ok}`);
  }
  await conn.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
