// Diagnóstico rápido de conexión y esquema.
// Uso: copia backend/.env.example a backend/.env con tus datos (Aiven) y ejecuta:
//   node _checkdb.js
const mysql = require('mysql2/promise');
const { buildDbConfig } = require('./src/utils/dbConfig');
require('dotenv').config();

const REQUERIDAS = ['usuarios', 'vehiculos', 'tipos_vehiculo', 'solicitudes_combustible', 'mantenimientos', 'configuracion', 'ubicaciones'];

(async () => {
  try {
    const conn = await mysql.createConnection({
      ...buildDbConfig(),
      ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 30000
    });
    console.log('✅ Conexión OK →', conn.config.host + '/' + conn.config.database);

    const [users] = await conn.query('SELECT id, nombre, username, rol_id, rol, activo, email FROM usuarios');
    console.log('Usuarios en BD:', JSON.stringify(users, null, 2));

    const [tabs] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
      [REQUERIDAS]
    );
    const presentes = new Set(tabs.map(t => t.TABLE_NAME));
    const faltantes = REQUERIDAS.filter(t => !presentes.has(t));
    console.log('Tablas presentes:', [...presentes].sort().join(', ') || '(ninguna)');
    if (faltantes.length) {
      console.log('❌ Tablas FALTANTES:', faltantes.join(', '));
      console.log('   Ejecuta la migración completa: npm run migrate:full');
    } else {
      console.log('✅ Esquema completo: todas las tablas requeridas existen.');
    }
    await conn.end();
  } catch (e) {
    console.error('❌ ERROR DE CONEXIÓN:', e.message);
    console.error('   Revisa backend/.env (DATABASE_URL o DB_*) — ver .env.example');
    process.exit(1);
  }
})();
