const mysql = require('mysql2/promise');
require('dotenv').config();
const { buildDbConfig } = require('../src/utils/dbConfig');

// Usa DATABASE_URL (URI de Aiven) o las variables DB_*; SSL activo por defecto en producción
const useSSL = process.env.DB_SSL !== 'false';
const cfg = {
  ...buildDbConfig(),
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
};

const SEED = [
  ['nombre_negocio', 'Control Vehicular'],
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

    // notificaciones_vistas: rastrea qué notificaciones ha visto cada usuario
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_vistas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        clave VARCHAR(120) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_notif_vista (usuario_id, clave)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('+ notificaciones_vistas garantizada');

    // solicitante_id en mantenimientos
    if (!(await columnExists(conn, 'mantenimientos', 'solicitante_id'))) {
      await conn.query('ALTER TABLE mantenimientos ADD COLUMN solicitante_id INT NULL AFTER observaciones');
      console.log('+ mantenimientos.solicitante_id agregado');
    } else {
      console.log('= mantenimientos.solicitante_id ya existe');
    }

    // ---- 2FA: twofa_activo + twofa_secreto --------------------------------
    if (!(await columnExists(conn, 'usuarios', 'twofa_activo'))) {
      await conn.query('ALTER TABLE usuarios ADD COLUMN twofa_activo TINYINT(1) NOT NULL DEFAULT 0 AFTER activo');
      console.log('+ usuarios.twofa_activo agregado');
    } else {
      console.log('= usuarios.twofa_activo ya existe');
    }
    if (!(await columnExists(conn, 'usuarios', 'twofa_secreto'))) {
      await conn.query('ALTER TABLE usuarios ADD COLUMN twofa_secreto TEXT NULL AFTER twofa_activo');
      console.log('+ usuarios.twofa_secreto agregado');
    } else {
      console.log('= usuarios.twofa_secreto ya existe');
    }

    // audit_log
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        evento VARCHAR(100) NOT NULL,
        usuario_id INT NULL,
        ip VARCHAR(45) NULL,
        detalle JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_al_evento (evento),
        INDEX idx_al_usuario (usuario_id),
        INDEX idx_al_fecha (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('+ audit_log garantizada');

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
