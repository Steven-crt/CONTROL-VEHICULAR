const mysql = require('mysql2/promise');
const fs = require('fs');
const { buildDbConfig } = require('./utils/dbConfig');
require('dotenv').config();

const useSSL = process.env.DB_SSL !== 'false'; // SSL activo por defecto en producción (Aiven lo exige)

// Soporte opcional de CA para validación estricta del certificado del servidor.
// - Si se define DB_CA_CERT (ruta a un .pem/ca.pem de Aiven) o DB_CA_PEM (contenido
//   inline del certificado), se activa rejectUnauthorized: true (MITM protegido).
// - Si NO se configura, se mantiene el comportamiento actual (rejectUnauthorized:
//   false) para NO romper la conexión existente con Aiven.
function buildSsl() {
  if (!useSSL) return undefined;
  const caPath = process.env.DB_CA_CERT;
  const caPem = process.env.DB_CA_PEM;
  let ca = null;
  if (caPath) {
    try {
      ca = fs.readFileSync(caPath, 'utf8');
      console.log(`🔒 SSL: CA cargada desde ${caPath} — validación estricta de certificado activada`);
    } catch (e) {
      console.error(`⚠️  No se pudo leer DB_CA_CERT (${caPath}): ${e.message}. Se usa SSL sin validación de CA.`);
    }
  } else if (caPem) {
    ca = caPem;
    console.log('🔒 SSL: CA cargada desde DB_CA_PEM — validación estricta de certificado activada');
  }
  if (ca) return { ca, rejectUnauthorized: true };
  return { rejectUnauthorized: false }; // comportamiento actual (compatibilidad Aiven)
}

const poolConfig = {
  ...buildDbConfig(),
  waitForConnections: true,
  // Pool dimensionable por entorno SIN tocar el código ni la conexión existente:
  // - DB_POOL_SIZE: máx. conexiones simultáneas (default 15, seguro para Aiven free).
  //   En el pasado se fijó 25; por defecto se baja a 15 para no superar los límites
  //   de conexiones del plan free de Aiven. Si tienes plan superior, súbelo por env.
  connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 15,
  // Cola FINITA: si se supera, mysql2 lanza POOL_ENQUEUELIMIT -> respondemos 503
  // en vez de acumular peticiones en memoria hasta quedarnos sin RAM (DoS propio).
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 50,
  idleTimeout: 60000, // Cerrar conexiones inactivas después de 60s
  connectTimeout: 10000, // 10s máximo para conectar
  // NOTA: sin acquireTimeout — en mysql2 3.9.x esa opción solo es válida en Pool
  // y al adquirir conexiones manualmente (pool.getConnection) emite un warning
  // "Ignoring invalid configuration option passed to Connection". La saturación
  // se cubre con queueLimit (colas finitas → 503 vía POOL_ENQUEUELIMIT).
  timezone: '+00:00',
  ssl: buildSsl()
};

const pool = mysql.createPool(poolConfig);

// Monitorización de consultas: loguea queries lentas (>500ms) para detectar
// problemas de rendimiento o abuso. Los parámetros NO se loguean (no filtran datos).
const QUERY_SLOW_MS = parseInt(process.env.DB_SLOW_QUERY_MS, 10) || 500;
const origQuery = pool.query.bind(pool);
pool.query = async function monitoredQuery(sql, params) {
  const start = Date.now();
  try {
    return await origQuery(sql, params);
  } catch (err) {
    // Cola del pool llena (queueLimit alcanzado) o timeout esperando conexión:
    // devolvemos un error con statusCode 503 para que internalError responda
    // "Servicio saturado" en vez de 500 genérico. El cliente puede reintentar.
    // mysql2 3.9.x lanza "Queue limit reached" SIN err.code (el código
    // POOL_ENQUEUELIMIT solo existe en versiones nuevas) — se detecta por ambos.
    const poolSaturado = (err && (
      err.code === 'POOL_ENQUEUELIMIT' ||
      err.code === 'POOL_BUSY' ||
      err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
      String(err.message || '').includes('Queue limit reached')
    ));
    if (poolSaturado) {
      const e = new Error('Pool de base de datos saturado');
      e.statusCode = 503;
      e.code = 'POOL_BUSY';
      throw e;
    }
    throw err;
  } finally {
    const ms = Date.now() - start;
    if (ms >= QUERY_SLOW_MS) {
      const sqlResumido = String(sql).replace(/\s+/g, ' ').slice(0, 300);
      console.warn(`[DB-SLOW] ${ms}ms — ${sqlResumido}`);
    }
  }
};

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
