require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  multipleStatements: true,
};

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [table]
  );
  return rows[0].n > 0;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return rows[0].n > 0;
}

async function addColumn(conn, table, column, definition, after) {
  if (await columnExists(conn, table, column)) {
    console.log(`= ${table}.${column} ya existe`);
    return;
  }
  await conn.query(`ALTER TABLE ${table} ADD COLUMN \`${column}\` ${definition}${after ? ` AFTER \`${after}\`` : ''}`);
  console.log(`+ ${table}.${column} agregada`);
}

(async () => {
  const conn = await mysql.createConnection(cfg);
  try {
    // ---- 1) Tablas base ------------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tipos_vehiculo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(
      "INSERT INTO tipos_vehiculo (nombre) VALUES ('Camioneta'), ('Camion'), ('Minivan') ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)"
    );
    console.log('+ tipos_vehiculo garantizada y sembrada');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tipos_mantenimiento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        cada_km INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await conn.query(
      "INSERT INTO tipos_mantenimiento (nombre, cada_km) VALUES ('Preventivo', 5000), ('Correctivo', NULL) ON DUPLICATE KEY UPDATE cada_km = VALUES(cada_km)"
    );
    console.log('+ tipos_mantenimiento garantizada y sembrada');

    if (!(await tableExists(conn, 'solicitudes_combustible'))) {
      await conn.query(`
        CREATE TABLE solicitudes_combustible (
          id INT AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(30) NULL,
          vehiculo_id INT NOT NULL,
          solicitante_id INT NULL,
          galones_solicitados DECIMAL(10,2) NULL,
          galones_surtidos DECIMAL(10,2) NULL,
          precio_por_galon DECIMAL(10,2) NULL DEFAULT 0,
          costo_total DECIMAL(10,2) NULL DEFAULT 0,
          kilometraje_actual DECIMAL(10,2) NULL,
          tipo_combustible VARCHAR(50) NULL DEFAULT 'Gasolina',
          estado VARCHAR(20) NOT NULL DEFAULT 'Surtida',
          fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          fecha_atencion DATETIME NULL,
          atendido_por_id INT NULL,
          observaciones TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_sc_vehiculo (vehiculo_id),
          INDEX idx_sc_fecha (fecha_solicitud),
          CONSTRAINT fk_sc_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('+ solicitudes_combustible creada');
    } else {
      console.log('= solicitudes_combustible ya existe');
    }

    if (!(await tableExists(conn, 'mantenimientos'))) {
      await conn.query(`
        CREATE TABLE mantenimientos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(30) NULL,
          vehiculo_id INT NOT NULL,
          tipo_mantenimiento_id INT NULL,
          tipo_servicio ENUM('Preventivo','Correctivo') NOT NULL DEFAULT 'Preventivo',
          descripcion TEXT NULL,
          kilometraje_programado INT NULL,
          kilometraje_realizado INT NULL,
          fecha_programada DATE NULL,
          fecha_realizada DATE NULL,
          costo DECIMAL(10,2) NOT NULL DEFAULT 0,
          proveedor VARCHAR(100) NULL,
          factura VARCHAR(100) NULL,
          estado VARCHAR(20) NOT NULL DEFAULT 'Completado',
          observaciones TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_mt_vehiculo (vehiculo_id),
          INDEX idx_mt_fecha (fecha_realizada),
          CONSTRAINT fk_mt_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('+ mantenimientos creada');
    } else {
      console.log('= mantenimientos ya existe');
    }

    if (!(await tableExists(conn, 'configuracion'))) {
      await conn.query(`
        CREATE TABLE configuracion (
          id INT AUTO_INCREMENT PRIMARY KEY,
          clave VARCHAR(100) NOT NULL UNIQUE,
          valor TEXT,
          descripcion VARCHAR(255),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('+ configuracion creada');
    } else {
      console.log('= configuracion ya existe');
    }

    // ---- 2) Columnas de vehiculos ----------------------------------------
    await addColumn(conn, 'vehiculos', 'tipo_vehiculo_id', 'INT NULL', 'placa');
    await addColumn(conn, 'vehiculos', 'ano', 'INT NULL', 'modelo');
    await addColumn(conn, 'vehiculos', 'kilometraje_actual', 'DECIMAL(10,2) NOT NULL DEFAULT 0', 'ano');
    await addColumn(conn, 'vehiculos', 'activo', 'TINYINT(1) NOT NULL DEFAULT 1', 'kilometraje_actual');
    await addColumn(conn, 'vehiculos', 'soat_numero', 'VARCHAR(50) NULL', 'activo');
    await addColumn(conn, 'vehiculos', 'soat_empresa', 'VARCHAR(100) NULL', 'soat_numero');
    await addColumn(conn, 'vehiculos', 'soat_fecha_inicio', 'DATE NULL', 'soat_empresa');
    await addColumn(conn, 'vehiculos', 'soat_fecha_vencimiento', 'DATE NULL', 'soat_fecha_inicio');

    // Backfill anio -> ano
    if (await columnExists(conn, 'vehiculos', 'anio')) {
      await conn.query('UPDATE vehiculos SET ano = anio WHERE ano IS NULL AND anio IS NOT NULL');
      console.log('+ vehiculos.anio copiado a ano');
    }
    // Backfill tipo -> tipo_vehiculo_id
    if (await columnExists(conn, 'vehiculos', 'tipo')) {
      await conn.query(
        `UPDATE vehiculos v LEFT JOIN tipos_vehiculo tv ON LOWER(tv.nombre) = LOWER(v.tipo)
         SET v.tipo_vehiculo_id = tv.id WHERE v.tipo_vehiculo_id IS NULL`
      );
      console.log('+ vehiculos.tipo mapeado a tipo_vehiculo_id');
    }
    await conn.query(
      `UPDATE vehiculos v LEFT JOIN tipos_vehiculo tv ON LOWER(tv.nombre) = 'camioneta'
       SET v.tipo_vehiculo_id = tv.id WHERE v.tipo_vehiculo_id IS NULL`
    );
    console.log('+ vehiculos sin tipo pasan a Camioneta');

    // ---- 3) ubicaciones.usuario_id ---------------------------------------
    await addColumn(conn, 'ubicaciones', 'usuario_id', 'INT NULL', 'vehiculo_id');

    // ---- 4) Columnas nuevas en tablas de gestión ---------------------------
    if (!(await columnExists(conn, 'solicitudes_combustible', 'tipo_combustible'))) {
      await conn.query(
        "ALTER TABLE solicitudes_combustible ADD COLUMN tipo_combustible VARCHAR(50) NULL DEFAULT 'Gasolina' AFTER galones_surtidos"
      );
      console.log('+ solicitudes_combustible.tipo_combustible agregada');
    } else {
      console.log('= solicitudes_combustible.tipo_combustible ya existe');
    }

    if (!(await columnExists(conn, 'mantenimientos', 'tipo_servicio'))) {
      await conn.query(
        "ALTER TABLE mantenimientos ADD COLUMN tipo_servicio ENUM('Preventivo','Correctivo') NOT NULL DEFAULT 'Preventivo' AFTER descripcion"
      );
      console.log('+ mantenimientos.tipo_servicio agregada');
    } else {
      console.log('= mantenimientos.tipo_servicio ya existe');
    }

    // ---- 5) Migrar datos desde tablas viejas ------------------------------
    if (await tableExists(conn, 'combustible')) {
      const [n] = await conn.query('SELECT COUNT(*) AS n FROM solicitudes_combustible');
      if (n[0].n === 0) {
        try {
          await conn.query(`
            INSERT INTO solicitudes_combustible
              (codigo, vehiculo_id, galones_solicitados, galones_surtidos, precio_por_galon, costo_total, kilometraje_actual, tipo_combustible, estado, fecha_solicitud, fecha_atencion, observaciones)
            SELECT CONCAT('SC-', id), vehiculo_id, litros, litros, precio_unitario, costo_total, km_actual, COALESCE(tipo_combustible, 'Gasolina'), 'Surtida', fecha_carga, fecha_carga, observaciones
            FROM combustible
          `);
          console.log('+ datos de combustible migrados a solicitudes_combustible');
        } catch (e) {
          console.warn('! no se pudieron migrar datos de combustible (esquema inesperado):', e.message);
        }
      } else {
        console.log('= solicitudes_combustible ya tiene datos, no se duplican');
      }
    }

    if (await tableExists(conn, 'mantenimiento')) {
      const [n] = await conn.query('SELECT COUNT(*) AS n FROM mantenimientos');
      if (n[0].n === 0) {
        try {
          await conn.query(`
            INSERT INTO mantenimientos
              (codigo, vehiculo_id, tipo_servicio, descripcion, kilometraje_realizado, fecha_realizada, costo, proveedor, observaciones, estado)
            SELECT CONCAT('MT-', id), vehiculo_id, COALESCE(tipo_servicio, 'Preventivo'), descripcion, km_actual, DATE(fecha), costo, proveedor, observaciones, 'Completado'
            FROM mantenimiento
          `);
          console.log('+ datos de mantenimiento migrados a mantenimientos');
        } catch (e) {
          console.warn('! no se pudieron migrar datos de mantenimiento (esquema inesperado):', e.message);
        }
      } else {
        console.log('= mantenimientos ya tiene datos, no se duplican');
      }
    }

    // ---- 6) usuarios: username, rol_id, admin -----------------------------
    await addColumn(conn, 'usuarios', 'username', 'VARCHAR(50) NULL', 'nombre');
    const [uniq] = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'usuarios' AND index_name = 'username'`
    );
    if (uniq[0].n === 0) {
      await conn.query('ALTER TABLE usuarios ADD UNIQUE INDEX username (username)');
      console.log('+ indice UNIQUE username agregado');
    } else {
      console.log('= indice username ya existe');
    }
    await addColumn(conn, 'usuarios', 'rol_id', 'VARCHAR(20) NULL', 'rol');
    if (await columnExists(conn, 'usuarios', 'rol')) {
      await conn.query('UPDATE usuarios SET rol_id = rol WHERE rol_id IS NULL AND rol IS NOT NULL');
      console.log('+ usuarios.rol copiado a rol_id');
    }
    await conn.query(`
      INSERT INTO usuarios (nombre, username, password, email, rol_id, activo) VALUES
      ('Administrador', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@controlvehicular.com', 'admin', 1)
      ON DUPLICATE KEY UPDATE rol_id = 'admin', activo = 1
    `);
    console.log('+ usuario admin garantizado');

    // ---- 7) Semillas de configuración --------------------------------------
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
    for (const [clave, valor] of SEED) {
      await conn.query(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [clave, valor]
      );
    }
    console.log(`+ ${SEED.length} claves de configuración sembradas`);

    console.log('MIGRACIÓN COMPLETA OK');
  } finally {
    await conn.end();
  }
})().catch((e) => {
  console.error('MIGRACIÓN COMPLETA FALLIDA:', e);
  process.exit(1);
});
