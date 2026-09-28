// Configuración de la conexión a la base de datos

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
