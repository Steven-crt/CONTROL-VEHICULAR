/**
 * reset_admin.js — Restablece la contraseña del usuario "admin".
 * SEGURIDAD: requiere password por argumento o env var, valida fortaleza, no loguea el secreto.
 * Uso: node scripts/reset_admin.js 'MiClaveFuerte123!'
 *  o: ADMIN_NEW_PASSWORD='...' node scripts/reset_admin.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { buildDbConfig } = require('../src/utils/dbConfig');

const nuevaClave = process.argv[2] || process.env.ADMIN_NEW_PASSWORD;
if (!nuevaClave) {
  console.error('❌ Debes indicar la nueva contraseña:');
  console.error('   node scripts/reset_admin.js \'MiClaveFuerte123!\'');
  console.error('   o: ADMIN_NEW_PASSWORD=\'...\' node scripts/reset_admin.js');
  process.exit(1);
}
if (nuevaClave.length < 12) {
  console.error('❌ La contraseña debe tener al menos 12 caracteres.');
  process.exit(1);
}
if (!/[A-Z]/.test(nuevaClave) || !/[a-z]/.test(nuevaClave) || !/[0-9]/.test(nuevaClave)) {
  console.error('❌ Debe contener mayúscula, minúscula y número.');
  process.exit(1);
}

const useSSL = process.env.DB_SSL !== 'false';

(async () => {
  const conn = await mysql.createConnection({
    ...buildDbConfig(),
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME IN ('rol_id','rol')`
    );
    const colMap = {};
    cols.forEach(c => { colMap[c.COLUMN_NAME] = c.DATA_TYPE; });
    const rolCol = colMap['rol_id'] ? 'rol_id' : (colMap['rol'] ? 'rol' : null);
    const esNumerico = !!colMap['rol_id'] && ['int', 'bigint', 'smallint', 'tinyint', 'mediumint'].includes(colMap['rol_id']);

    const hash = await bcrypt.hash(nuevaClave, 12);
    const rolVal = rolCol ? (esNumerico ? 1 : 'admin') : null;

    const [existe] = await conn.query('SELECT COUNT(*) AS n FROM usuarios WHERE username = ?', ['admin']);

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
    console.log('   Usuario: admin (contraseña actualizada — no se muestra por seguridad).');
  } finally {
    await conn.end();
  }
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
