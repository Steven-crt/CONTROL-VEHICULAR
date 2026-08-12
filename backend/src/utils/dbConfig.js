/**
 * Construye la configuración de conexión MySQL a partir de:
 *   - Opción A (recomendada para Aiven): DATABASE_URL con la URI completa
 *       mysql://avnadmin:CLAVE@mysql-xxxx.aivencloud.com:26355/defaultdb?ssl-mode=REQUIRED
 *   - Opción B (local o variables individuales): DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *
 * NOTA: este módulo NO carga dotenv; cada consumidor decide cómo cargar sus env vars.
 */

function parseDatabaseUrl(url) {
  try {
    const u = new URL(url);
    if (!['mysql:', 'mariadb:'].includes(u.protocol)) return null;
    const sslRequired = u.searchParams.get('ssl-mode')?.toUpperCase() === 'REQUIRED' ||
                        u.searchParams.get('ssl') === 'true';
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 3306,
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      database: (u.pathname || '').replace(/^\//, '') || undefined,
      ssl: sslRequired ? { rejectUnauthorized: false } : undefined
    };
  } catch {
    return null;
  }
}

function buildDbConfig(overrides = {}) {
  if (process.env.DATABASE_URL) {
    const fromUrl = parseDatabaseUrl(process.env.DATABASE_URL);
    if (fromUrl) {
      return { ...fromUrl, ...overrides };
    }
    console.warn('⚠️  DATABASE_URL no es una URI mysql:// válida, usando variables DB_*');
  }

  // En hosts de Aiven el nombre de BD por defecto es "defaultdb"; localmente "parqueo_db"
  const host = process.env.DB_HOST || 'localhost';
  const defaultDb = String(host).includes('aivencloud.com') ? 'defaultdb' : 'parqueo_db';

  return {
    host,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || defaultDb,
    ...overrides
  };
}

module.exports = { buildDbConfig, parseDatabaseUrl };
