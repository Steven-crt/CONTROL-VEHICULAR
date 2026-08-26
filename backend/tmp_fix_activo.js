const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test' });
  const [cols] = await c.query('SHOW COLUMNS FROM usuarios');
  console.log(cols.map(x => x.Field).join(', '));
  const [u] = await c.query("SELECT id, username, activo FROM usuarios WHERE username LIKE 'test_%'");
  console.table(u);
  const [r] = await c.query("UPDATE usuarios SET activo=1 WHERE username IN ('test_admin','test_empleado')");
  console.log('UPDATE OK affectedRows=' + r.affectedRows);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
