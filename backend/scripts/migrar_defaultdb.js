const mysql = require('mysql2/promise');
require('dotenv').config();

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

const SEED = [
  ['nombre_negocio', 'Mi Empresa de Flota'],
  ['ruc', ''],
  ['direccion', ''],
  ['telefono', ''],
  ['email', ''],
  ['moneda', '$'],
  ['logo_url', ''],
  ['total_vehiculos', '30'],
  ['formato_placa', 'ABC-1234'],
  ['tipos_vehiculo', 'Camioneta, Camion, Minivan'],
  ['intervalo_mant_km', '5000'],
  ['intervalo_mant_dias', '90'],
  ['alerta_combustible', '50'],
  ['monitoreo_gps', 'Inactivo'],
  ['alertas_vencimiento', 'Activas'],
];

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return rows[0].n > 0;
}

(async () => {
  const conn = await mysql.createConnection(cfg);
  try {
    if (!(await columnExists(conn, 'solicitudes_combustible', 'tipo_combustible'))) {
      await conn.query(
        `ALTER TABLE solicitudes_combustible ADD COLUMN tipo_combustible VARCHAR(50) NULL DEFAULT 'Gasolina' AFTER galones_surtidos`
      );
      console.log('+ tipo_combustible anadido a solicitudes_combustible');
    } else {
      console.log('= tipo_combustible ya existe');
    }

    if (!(await columnExists(conn, 'mantenimientos', 'tipo_servicio'))) {
      await conn.query(
        `ALTER TABLE mantenimientos ADD COLUMN tipo_servicio ENUM('Preventivo','Correctivo') NOT NULL DEFAULT 'Preventivo' AFTER descripcion`
      );
      console.log('+ tipo_servicio anadido a mantenimientos');
    } else {
      console.log('= tipo_servicio ya existe');
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clave VARCHAR(100) NOT NULL UNIQUE,
        valor TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('+ tabla configuracion garantizada');

    for (const [clave, valor] of SEED) {
      await conn.query(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [clave, valor]
      );
    }
    console.log(`+ ${SEED.length} claves de configuracion sembradas`);

    const [n] = await conn.query('SELECT COUNT(*) AS n FROM configuracion');
    console.log('Total claves configuracion:', n[0].n);
    console.log('MIGRACION OK');
  } finally {
    await conn.end();
  }
})().catch((e) => {
  console.error('MIGRACION FALLIDA:', e);
  process.exit(1);
});
