
const mysql = require('mysql2/promise');
require('dotenv').config();
const { buildDbConfig } = require('../src/utils/dbConfig');

const useSSL = process.env.DB_SSL !== 'false';
const cfg = {
  ...buildDbConfig(),
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
};

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
    // ------------------------------------------------------------
    // 1) Unificar roles: todo lo que no sea admin -> empleado (rol_id=2)
    // ------------------------------------------------------------
    if (await columnExists(conn, 'usuarios', 'rol_id')) {
      await conn.query(
        'UPDATE usuarios SET rol_id = 2 WHERE rol_id IS NULL OR rol_id <> 1'
      );
      console.log('= usuarios.rol_id normalizado (1=admin, 2=empleado)');
    } else {
      throw new Error('La columna usuarios.rol_id no existe');
    }

    // Instalaciones antiguas con columna texto `rol`: normalizar si existe
    if (await columnExists(conn, 'usuarios', 'rol')) {
      await conn.query(
        "UPDATE usuarios SET rol = 'empleado' WHERE rol IN ('operador', 'cajero', '2', '3')"
      );
      console.log('= usuarios.rol legacy normalizado a empleado');
    }

    // ------------------------------------------------------------
    // 2) Tabla anomalias
    // ------------------------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS anomalias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(30) NOT NULL UNIQUE,
        vehiculo_id INT NOT NULL,
        usuario_id INT NULL,
        tipo VARCHAR(50) NOT NULL DEFAULT 'Otro',
        severidad ENUM('baja','media','alta') NOT NULL DEFAULT 'media',
        descripcion TEXT,
        foto_url VARCHAR(255) NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
        fecha_resuelta DATETIME NULL,
        resuelta_por_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_anomalias_vehiculo (vehiculo_id),
        INDEX idx_anomalias_estado (estado),
        INDEX idx_anomalias_usuario (usuario_id),
        CONSTRAINT fk_anomalias_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('+ tabla anomalias garantizada');

    // ------------------------------------------------------------
    // 3) Trazabilidad del solicitante en mantenimientos
    // ------------------------------------------------------------
    if (!(await columnExists(conn, 'mantenimientos', 'solicitante_id'))) {
      await conn.query(
        'ALTER TABLE mantenimientos ADD COLUMN solicitante_id INT NULL AFTER observaciones'
      );
      console.log('+ mantenimientos.solicitante_id agregado');
    } else {
      console.log('= mantenimientos.solicitante_id ya existe');
    }

    // ------------------------------------------------------------
    // 4) Vocabulario de estados de mantenimientos (app usa
    //    Pendiente/Completado/Rechazado; el ENUM legacy tenía otros)
    // ------------------------------------------------------------
    await conn.query(
      "UPDATE mantenimientos SET estado = 'Pendiente' WHERE estado = 'Programado'"
    );
    await conn.query(
      "UPDATE mantenimientos SET estado = 'Completado' WHERE estado IN ('En Proceso', 'Finalizado')"
    );
    await conn.query(
      "UPDATE mantenimientos SET estado = 'Rechazado' WHERE estado = 'Cancelado'"
    );
    await conn.query(
      "ALTER TABLE mantenimientos MODIFY COLUMN estado ENUM('Pendiente','Completado','Rechazado') NOT NULL DEFAULT 'Pendiente'"
    );
    console.log('= mantenimientos.estado normalizado a Pendiente/Completado/Rechazado');

    // ------------------------------------------------------------
    // 5) Registro de notificaciones vistas por usuario (badge dinámico)
    // ------------------------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_vistas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        clave VARCHAR(120) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_notif_vista (usuario_id, clave)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('+ tabla notificaciones_vistas garantizada');

    console.log('MIGRACION OK');
  } finally {
    await conn.end();
  }
})().catch((e) => {
  console.error('MIGRACION FALLIDA:', e.message || e);
  process.exit(1);
});
