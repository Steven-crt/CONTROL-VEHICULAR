/**
 * Crea la BD de pruebas LOCAL (127.0.0.1:3309/control_vehicular_test)
 * clonando esquema+datos de Aiven. No toca backend/.env ni Aiven.
 *
 * Uso: node scripts/setup_test_db.js
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { buildDbConfig } = require('../src/utils/dbConfig');

const TEST = {
  host: '127.0.0.1',
  port: 3309,
  user: 'root',
  password: '160507',
  database: 'control_vehicular_test',
};
const SKIP_SYSTEM = ['information_schema', 'mysql', 'performance_schema', 'sys'];

(async () => {
  // 1) Conectar a Aiven y leer DDL + datos
  const aiven = await mysql.createConnection({
    ...buildDbConfig(),
    ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : undefined,
  });
  const [tabs] = await aiven.query('SHOW TABLES');
  const tableCol = Object.keys(tabs[0])[0];
  const tables = tabs.map(t => t[tableCol]);
  console.log('Tablas en Aiven:', tables.join(', '));

  // Aiven usa ANSI_QUOTES; quitarlo para que SHOW CREATE TABLE devuelva backticks
  await aiven.query("SET SESSION sql_mode = REPLACE(@@sql_mode, 'ANSI_QUOTES', '')");

  const ddl = {};
  for (const t of tables) {
    const [rows] = await aiven.query(`SHOW CREATE TABLE \`${t}\``);
    // Aiven puede emitir identificadores entre comillas dobles -> normalizar a backticks
    ddl[t] = rows[0]['Create Table'].replace(/"([A-Za-z0-9_$]+)"/g, '`$1`');
    console.log(`  DDL ok: ${t}`);
  }

  // 2) Recrear BD de pruebas
  const { database: _omit, ...TEST_SERVER } = TEST;
  const local0 = await mysql.createConnection(TEST_SERVER);
  console.log('paso: conectado a servidor local');
  await local0.query('DROP DATABASE IF EXISTS control_vehicular_test');
  await local0.query('CREATE DATABASE control_vehicular_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await local0.end();
  console.log('paso: BD recreada');
  const local = await mysql.createConnection(TEST);
  console.log('paso: conectado a test db');
  await local.query('SET FOREIGN_KEY_CHECKS=0');
  console.log('paso: FK checks off');

  // 3) Crear tablas
  for (const t of tables) {
    try {
      await local.query(ddl[t]);
      console.log(`+ tabla creada en test: ${t}`);
    } catch (e) {
      console.error(`! fallo DDL ${t}:`, e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n'));
      throw e;
    }
  }
  console.log('paso: tablas listas, copiando datos');

  // 3b) Garantizar roles base ANTES de copiar datos de usuarios
  // (si Aiven tiene role vacío, la FK usuarios.rol_id→role.id falla al insertar usuarios)
  await local.query(`
    INSERT IGNORE INTO \`role\` (id, nombre) VALUES
      (1, 'admin'),
      (2, 'empleado')
  `);
  console.log('paso: roles base garantizados (1=admin, 2=empleado)');

  // 4) Copiar datos
  for (const t of tables) {
    // detectar columnas JSON (Aiven puede tener strings vacíos inválidos)
    const [colinfo] = await aiven.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND DATA_TYPE = 'json'`,
      [t]
    );
    const jsonCols = new Set(colinfo.map(r => r.COLUMN_NAME));
    const [rows] = await aiven.query(`SELECT * FROM \`${t}\``);
    if (rows.length === 0) { console.log(`= ${t}: sin datos`); continue; }
    const cols = Object.keys(rows[0]);
    const colSql = cols.map(c => `\`${c}\``).join(', ');
    const dupSql = cols.map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(', ');
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100).map(r => {
        const rr = { ...r };
        for (const jc of jsonCols) {
          // el driver devuelve objetos parseados; al reinsertar hay que re-serializar
          if (rr[jc] !== null && typeof rr[jc] === 'object') rr[jc] = JSON.stringify(rr[jc]);
          else if (typeof rr[jc] === 'string' && rr[jc].trim() === '') rr[jc] = null;
        }
        return rr;
      });
      const placeholders = chunk.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
      const values = chunk.flatMap(r => cols.map(c => r[c]));
      await local.query(
        `INSERT INTO \`${t}\` (${colSql}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${dupSql}`,
        values
      );
      inserted += chunk.length;
    }
    console.log(`= ${t}: ${inserted} filas copiadas`);
  }
  await local.query('SET FOREIGN_KEY_CHECKS=1');

  // 5) Aplicar migración rol/anomalias/solicitante_id
  await local.query("UPDATE usuarios SET rol_id = 2 WHERE rol_id IS NULL OR rol_id <> 1");
  await local.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [[{ n }]] = await local.query(
    "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema='control_vehicular_test' AND table_name='mantenimientos' AND column_name='solicitante_id'"
  );
  if (!n) await local.query('ALTER TABLE mantenimientos ADD COLUMN solicitante_id INT NULL AFTER observaciones');

  // 5b) Tabla de notificaciones vistas (badge dinámico)
  await local.query(`
    CREATE TABLE IF NOT EXISTS notificaciones_vistas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      clave VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_notif_vista (usuario_id, clave)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 6) Usuarios de prueba (password: test1234)
  const hash = await bcrypt.hash('test1234', 8);
  await local.query(
    `INSERT INTO usuarios (nombre, username, apellido, email, password, telefono, rol_id, activo)
     VALUES ('Admin Test','test_admin','Prueba','testadmin@local.dev',?,'0999990001',1,1),
            ('Empleado Test','test_empleado','Prueba','testempleado@local.dev',?,'0999990002',2,1)
     ON DUPLICATE KEY UPDATE password=VALUES(password), rol_id=VALUES(rol_id), activo=1`,
    [hash, hash]
  );

  const [us] = await local.query('SELECT id, username, rol_id FROM usuarios ORDER BY id');
  console.log('\nUsuarios en test:', JSON.stringify(us));
  const [an] = await local.query("SHOW TABLES LIKE 'anomalias'");
  console.log('anomalias creada:', an.length > 0);

  await aiven.end();
  await local.end();
  console.log('\nSETUP TEST DB OK -> 127.0.0.1:3309/control_vehicular_test');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
