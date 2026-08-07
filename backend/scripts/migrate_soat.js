require('dotenv').config();
const mysql = require('mysql2/promise');

const useSSL = process.env.DB_SSL === 'true';

const columns = [
  { name: 'soat_numero', def: 'VARCHAR(50) NULL', after: 'anio' },
  { name: 'soat_empresa', def: 'VARCHAR(100) NULL', after: 'soat_numero' },
  { name: 'soat_fecha_inicio', def: 'DATE NULL', after: 'soat_empresa' },
  { name: 'soat_fecha_vencimiento', def: 'DATE NULL', after: 'soat_fecha_inicio' },
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'parqueo_db',
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  });

  const [existing] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos'`
  );
  const existingNames = new Set(existing.map(r => r.COLUMN_NAME));

  let added = 0;
  for (const col of columns) {
    if (existingNames.has(col.name)) {
      console.log(`✔ ${col.name} ya existe`);
      continue;
    }
    await conn.query(
      `ALTER TABLE vehiculos ADD COLUMN \`${col.name}\` ${col.def} AFTER \`${col.after}\``
    );
    console.log(`+ ${col.name} agregada`);
    added++;
  }

  console.log(added === 0 ? 'Sin cambios: todo en orden.' : `Migración SOAT completada (${added} columnas agregadas).`);
  await conn.end();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
