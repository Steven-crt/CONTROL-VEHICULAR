const mysql = require('mysql2/promise');
const { buildDbConfig } = require('./utils/dbConfig');
require('dotenv').config();

const useSSL = process.env.DB_SSL !== 'false'; // SSL activo por defecto en producción (Aiven lo exige)

const poolConfig = {
  ...buildDbConfig(),
  waitForConnections: true,
  connectionLimit: 25, // Aumentado de 10 para soportar más tráfico
  queueLimit: 0,
  idleTimeout: 60000, // Cerrar conexiones inactivas después de 60s
  connectTimeout: 10000, // 10s máximo para conectar
  timezone: '+00:00',
  // SSL requerido por Aiven — rejectUnauthorized: false acepta el cert de Aiven sin CA local
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
};

const pool = mysql.createPool(poolConfig);

// Contador de conexiones activas para monitoreo
let activeConnections = 0;
const trackConnection = {
  getConnection: pool.getConnection.bind(pool),
  release: pool.releaseConnection.bind(pool)
};

pool.getConnection = async () => {
  activeConnections++;
  console.log(`[Pool] Conexión adquirida (${activeConnections} activas)`);
  try {
    const conn = await trackConnection.getConnection();
    // Añadir callback de release para tracking
    const originalRelease = conn.release;
    conn.release = () => {
      activeConnections--;
      console.log(`[Pool] Conexión liberada (${activeConnections} activas)`);
      return originalRelease.call(conn);
    };
    return conn;
  } catch (err) {
    activeConnections--;
    console.error('[Pool] Error al adquirir conexión:', err.message);
    throw err;
  }
};

const origen = process.env.DATABASE_URL ? 'DATABASE_URL (URI de Aiven)' : 'variables DB_*';

// Verificar conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log(`✅ Conectado a MySQL: ${poolConfig.host}/${poolConfig.database} (SSL: ${useSSL}) — origen: ${origen}`);
    console.log(`📦 Pool: ${poolConfig.connectionLimit} conexiones máx., connectTimeout: ${poolConfig.connectTimeout}ms`);
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
