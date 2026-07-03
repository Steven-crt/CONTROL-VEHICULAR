require('dotenv').config();
const mysql = require('mysql2/promise');

async function fix() {
  console.log('Conectando a MySQL...');
  console.log('Host:', process.env.DB_HOST, 'Puerto:', process.env.DB_PORT);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Conexion exitosa. Aplicando correcciones...\n');

  const alteraciones = [
    'ALTER TABLE usuarios MODIFY COLUMN telefono VARCHAR(500)',
    'ALTER TABLE vehiculos MODIFY COLUMN numero_motor VARCHAR(500)',
    'ALTER TABLE vehiculos MODIFY COLUMN numero_chasis VARCHAR(500)',
    'ALTER TABLE proveedores MODIFY COLUMN telefono VARCHAR(500)',
    'ALTER TABLE proveedores MODIFY COLUMN email VARCHAR(500)'
  ];

  for (const sql of alteraciones) {
    try {
      await conn.execute(sql);
      console.log('✓ OK:', sql);
    } catch (e) {
      console.error('✗ Error en:', sql, '->', e.message);
    }
  }

  await conn.end();
  console.log('\nScript finalizado. Reinicia el backend.');
}

fix().catch(e => {
  console.error('Error fatal:', e.message);
  process.exit(1);
});
