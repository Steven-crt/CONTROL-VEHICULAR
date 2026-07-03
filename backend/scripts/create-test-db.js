const mysql = require('mysql2/promise');
require('dotenv').config();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no configurado en variables de entorno`);
  }
  return value;
}

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: requiredEnv('DB_HOST'),
      user: requiredEnv('DB_USER'),
      password: requiredEnv('DB_PASSWORD'),
    });
    await conn.execute('CREATE DATABASE IF NOT EXISTS control_vehicular_test');
    console.log('Test database created/verified.');
    await conn.end();
  } catch (err) {
    console.error('Failed to create test database:', err.message);
    process.exit(1);
  }
})();
