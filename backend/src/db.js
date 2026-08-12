const mysql = require('mysql2/promise');
const { buildDbConfig } = require('./utils/dbConfig');
require('dotenv').config();

const useSSL = process.env.DB_SSL !== 'false'; // SSL activo por defecto en producción (Aiven lo exige)

const poolConfig = {
  ...buildDbConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  connectTimeout: 30000,
  // SSL requerido por Aiven — rejectUnauthorized: false acepta el cert de Aiven sin CA local
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
};

const pool = mysql.createPool(poolConfig);

const origen = process.env.DATABASE_URL ? 'DATABASE_URL (URI de Aiven)' : 'variables DB_*';

// Verificar conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log(`✅ Conectado a MySQL: ${poolConfig.host}/${poolConfig.database} (SSL: ${useSSL}) — origen: ${origen}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión MySQL:', err.message);
    console.error('   Origen de configuración:', origen);
    console.error('   Host:', poolConfig.host);
    console.error('   Puerto:', poolConfig.port);
    console.error('   Usuario:', poolConfig.user);
    console.error('   Base de datos:', poolConfig.database);
    console.error('   SSL:', useSSL);
    console.error('   💡 Revisa las variables en Render (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)');
    console.error('      o usa DATABASE_URL con la URI completa que Aiven te da en "Connection info".');
    // No se lanza el error para que el servidor arranque igual
    // (Render puede reintentar después)
  });

module.exports = pool;
