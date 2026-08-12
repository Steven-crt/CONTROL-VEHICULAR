/**
 * Restablece la contraseña del usuario "admin" a "admin123" (o la indicada como argumento).
 *
 * Uso:
 *   npm run reset:admin                      -> deja admin / admin123
 *   npm run reset:admin -- mi-clave-fuerte   -> deja admin / mi-clave-fuerte
 *
 * Configuración de BD: copia backend/.env.example a backend/.env y completa
 * DATABASE_URL (URI de Aiven) o las variables DB_*.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { buildDbConfig } = require('../src/utils/dbConfig');

const nuevaClave = process.argv[2] || 'admin123';
const useSSL = process.env.DB_SSL !== 'false';

(async () => {
  const conn = await mysql.createConnection({
    ...buildDbConfig(),
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  });
  try {
    // Detectar si la columna de rol es rol_id (numérica o texto) o rol
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME IN ('rol_id','rol')`
    );
    const colMap = {};
    cols.forEach(c => { colMap[c.COLUMN_NAME] = c.DATA_TYPE; });
    const rolCol = colMap['rol_id'] ? 'rol_id' : (colMap['rol'] ? 'rol' : null);
    const esNumerico = !!colMap['rol_id'] && ['int', 'bigint', 'smallint', 'tinyint', 'mediumint'].includes(colMap['rol_id']);

    const hash = bcrypt.hashSync(nuevaClave, 10);
    const rolVal = rolCol ? (esNumerico ? 1 : 'admin') : null;

    const [existe] = await conn.query(
      'SELECT COUNT(*) AS n FROM usuarios WHERE username = ?',
      ['admin']
    );

    if (existe[0].n > 0) {
      const colsSet = rolCol ? `, ${rolCol} = ?` : '';
      const params = rolCol ? [hash, rolVal] : [hash];
      await conn.query(`UPDATE usuarios SET password = ?${colsSet}, activo = 1 WHERE username = 'admin'`, [...params]);
      console.log('✅ Contraseña del usuario admin actualizada.');
    } else {
      const rolCols = rolCol ? `, ${rolCol}` : '';
      const rolVals = rolCol ? [rolVal] : [];
      await conn.query(
        `INSERT INTO usuarios (nombre, username, password, email, activo${rolCols}) VALUES ('Administrador', 'admin', ?, 'admin@controlvehicular.com', 1${rolCol ? ', ?' : ''})`,
        [hash, ...rolVals]
      );
      console.log('✅ Usuario admin creado.');
    }

    console.log(`   Usuario: admin  /  Contraseña: ${nuevaClave}`);
  } finally {
    await conn.end();
  }
})().catch(err => {
  console.error('❌ Error:', err.message);
  console.error('   ¿Revisaste la configuración de BD? Ver backend/.env o las variables DB_* / DATABASE_URL.');
  process.exit(1);
});
