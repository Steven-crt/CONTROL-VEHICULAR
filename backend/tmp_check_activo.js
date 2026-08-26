const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test' });
  const [rows] = await c.query('SELECT id, username, rol_id, activo, LENGTH(password_hash) as hash_len FROM usuarios');
  console.table(rows);
  const [u] = await c.query("SELECT password_hash, activo FROM usuarios WHERE username='test_admin'");
  if (u.length) {
    console.log('match:', await bcrypt.compare('test1234', u[0].password_hash), '| activo:', u[0].activo);
  }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
