const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test' });
  const [rows] = await c.query("SELECT id, username, rol_id, activo, password FROM usuarios WHERE username IN ('test_admin','test_empleado','admin')");
  for (const u of rows) {
    const pass = u.username.startsWith('test_') ? 'test1234' : 'admin123';
    console.log(u.username, '| len(hash)=', u.password.length, '| match(' + pass + '):', await bcrypt.compare(pass, u.password));
  }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
