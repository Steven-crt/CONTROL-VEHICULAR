const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 30000
    });
    const [users] = await conn.query('SELECT username, password FROM usuarios WHERE activo = 1');
    const candidates = ['password', 'admin123', 'admin', 'admin1234', '123456', 'Admin123', 'admin12345', 'empleado', 'empleado123', 'password123', 'parqueo', 'vehicular', 'Control123', 'control'];
    for (const u of users) {
      for (const c of candidates) {
        if (bcrypt.compareSync(c, u.password)) {
          console.log('MATCH:', u.username, '/', c);
        }
      }
    }
    await conn.end();
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
