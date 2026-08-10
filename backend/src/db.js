const mysql = require('mysql2/promise');
require('dotenv').config();

const useSSL = process.env.DB_SSL !== 'false'; // SSL activo por defecto en producción

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parqueo_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  connectTimeout: 30000,
  // SSL requerido por Aiven — rejectUnauthorized: false acepta el cert de Aiven sin CA local
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
};

const pool = mysql.createPool(poolConfig);

// Verificar conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log(`✅ Conectado a MySQL: ${process.env.DB_HOST}/${process.env.DB_NAME} (SSL: ${useSSL})`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión MySQL:', err.message);
    console.error('   Host:', process.env.DB_HOST);
    console.error('   Puerto:', process.env.DB_PORT);
    console.error('   Usuario:', process.env.DB_USER);
    console.error('   Base de datos:', process.env.DB_NAME);
    console.error('   SSL:', useSSL);
    // No se lanza el error para que el servidor arranque igual
    // (Render puede reintentar después)
  });

module.exports = pool;
