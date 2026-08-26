const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test' });
  const hash = await bcrypt.hash('test1234', 8);
  const [r] = await c.query("UPDATE usuarios SET password=?, activo=1 WHERE username IN ('test_admin','test_empleado')", [hash]);
  console.log('passwords reseteadas:', r.affectedRows);
  const [rows] = await c.query("SELECT username, password FROM usuarios WHERE username LIKE 'test_%'");
  for (const u of rows) console.log(u.username, 'match:', await bcrypt.compare('test1234', u.password));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
