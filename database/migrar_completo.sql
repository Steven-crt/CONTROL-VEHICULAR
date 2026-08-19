-- ============================================================
-- MIGRACIÓN COMPLETA E IDEMPOTENTE — Gestión Vehicular
-- BD desplegada: defaultdb (Aiven)
-- Ejecutar en Aiven SQL Console (o MySQL Workbench sobre la BD correspondiente).
-- Se puede ejecutar varias veces sin problema: todo está protegido por
-- comprobaciones de información_schema.
--
-- Cubre TODO lo que necesita el backend actual:
--   1) Tablas: tipos_vehiculo, tipos_mantenimiento, solicitudes_combustible,
--      mantenimientos, configuracion
--   2) Columnas de vehiculos: tipo_vehiculo_id, ano, kilometraje_actual,
--      activo y las 4 de SOAT
--   3) Columna usuario_id en ubicaciones
--   4) username y rol_id en usuarios (con admin asegurado)
--   5) Migración de datos: combustible -> solicitudes_combustible,
--      mantenimiento -> mantenimientos, anio -> ano, tipo -> tipo_vehiculo_id
--   6) Semillas: tipos de vehículo, tipos de mantenimiento y configuración
-- ============================================================

-- ============================================================
-- 1) TABLAS
-- ============================================================

-- Tipos de vehículo (flota = camioneta, camion, minivan)
CREATE TABLE IF NOT EXISTS tipos_vehiculo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tipos_vehiculo (nombre) VALUES ('Camioneta'), ('Camion'), ('Minivan')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Tipos de mantenimiento
CREATE TABLE IF NOT EXISTS tipos_mantenimiento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  cada_km INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tipos_mantenimiento (nombre, cada_km) VALUES ('Preventivo', 5000), ('Correctivo', NULL)
ON DUPLICATE KEY UPDATE cada_km = VALUES(cada_km);

-- Solicitudes de combustible (reemplaza a la antigua tabla combustible)
CREATE TABLE IF NOT EXISTS solicitudes_combustible (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mantenimientos (reemplaza a la antigua tabla mantenimiento)
CREATE TABLE IF NOT EXISTS mantenimientos (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Configuración
CREATE TABLE IF NOT EXISTS configuracion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  descripcion VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2) COLUMNAS DE vehiculos
-- ============================================================

-- tipo_vehiculo_id (FK a tipos_vehiculo)
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'tipo_vehiculo_id');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN tipo_vehiculo_id INT NULL AFTER placa',
  'SELECT "tipo_vehiculo_id ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ano (nuevo nombre; el esquema viejo usaba anio)
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'ano');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN ano INT NULL AFTER modelo',
  'SELECT "ano ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- kilometraje_actual
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'kilometraje_actual');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN kilometraje_actual DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER ano',
  'SELECT "kilometraje_actual ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- activo
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'activo');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER kilometraje_actual',
  'SELECT "activo ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SOAT: soat_numero
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'soat_numero');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN soat_numero VARCHAR(50) NULL AFTER activo',
  'SELECT "soat_numero ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SOAT: soat_empresa
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'soat_empresa');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN soat_empresa VARCHAR(100) NULL AFTER soat_numero',
  'SELECT "soat_empresa ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SOAT: soat_fecha_inicio
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'soat_fecha_inicio');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN soat_fecha_inicio DATE NULL AFTER soat_empresa',
  'SELECT "soat_fecha_inicio ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SOAT: soat_fecha_vencimiento
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'soat_fecha_vencimiento');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN soat_fecha_vencimiento DATE NULL AFTER soat_fecha_inicio',
  'SELECT "soat_fecha_vencimiento ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: copiar anio -> ano si existe la columna vieja
SET @has_anio = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'anio');
SET @sql = IF(@has_anio = 0,
  'SELECT "sin columna anio" AS resultado',
  'UPDATE vehiculos SET ano = anio WHERE ano IS NULL AND anio IS NOT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: mapear tipo -> tipo_vehiculo_id si existe la columna vieja
SET @has_tipo = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'tipo');
SET @sql = IF(@has_tipo = 0,
  'SELECT "sin columna tipo" AS resultado',
  'UPDATE vehiculos v LEFT JOIN tipos_vehiculo tv ON LOWER(tv.nombre) = LOWER(v.tipo) SET v.tipo_vehiculo_id = tv.id WHERE v.tipo_vehiculo_id IS NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: cualquier vehículo sin tipo_vehiculo_id pasa a Camioneta
SET @sql = 'UPDATE vehiculos v LEFT JOIN tipos_vehiculo tv ON LOWER(tv.nombre) = ''camioneta'' SET v.tipo_vehiculo_id = tv.id WHERE v.tipo_vehiculo_id IS NULL';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 3) COLUMNA usuario_id EN ubicaciones (la usa el backend en GPS/combustible)
-- ============================================================
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ubicaciones' AND COLUMN_NAME = 'usuario_id');
SET @sql = IF(@exists = 0,
  'ALTER TABLE ubicaciones ADD COLUMN usuario_id INT NULL AFTER vehiculo_id',
  'SELECT "usuario_id en ubicaciones ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 4) COLUMNA tipo_combustible EN solicitudes_combustible
-- ============================================================
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_combustible' AND COLUMN_NAME = 'tipo_combustible');
SET @sql = IF(@exists = 0,
  'ALTER TABLE solicitudes_combustible ADD COLUMN tipo_combustible VARCHAR(50) NULL DEFAULT ''Gasolina'' AFTER galones_surtidos',
  'SELECT "tipo_combustible ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 5) COLUMNA tipo_servicio EN mantenimientos
-- ============================================================
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mantenimientos' AND COLUMN_NAME = 'tipo_servicio');
SET @sql = IF(@exists = 0,
  'ALTER TABLE mantenimientos ADD COLUMN tipo_servicio ENUM(''Preventivo'',''Correctivo'') NOT NULL DEFAULT ''Preventivo'' AFTER descripcion',
  'SELECT "tipo_servicio ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 6) MIGRACIÓN DE DATOS DESDE LAS TABLAS VIEJAS
--    Solo copia si la tabla vieja existe y la nueva está vacía.
-- ============================================================

-- combustible -> solicitudes_combustible
SET @has_old = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'combustible');
SET @has_col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'combustible' AND COLUMN_NAME = 'litros');
SET @new_count = (SELECT COUNT(*) FROM solicitudes_combustible);
SET @sql = IF(@has_old > 0 AND @has_col > 0 AND @new_count = 0,
  'INSERT INTO solicitudes_combustible (codigo, vehiculo_id, galones_solicitados, galones_surtidos, precio_por_galon, costo_total, kilometraje_actual, tipo_combustible, estado, fecha_solicitud, fecha_atencion, observaciones) SELECT CONCAT(''SC-'', id), vehiculo_id, litros, litros, precio_unitario, costo_total, km_actual, COALESCE(tipo_combustible, ''Gasolina''), ''Surtida'', fecha_carga, fecha_carga, observaciones FROM combustible',
  'SELECT "combustible sin datos o ya migrado" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mantenimiento -> mantenimientos
SET @has_old = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mantenimiento');
SET @has_col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mantenimiento' AND COLUMN_NAME = 'km_actual');
SET @new_count = (SELECT COUNT(*) FROM mantenimientos);
SET @sql = IF(@has_old > 0 AND @has_col > 0 AND @new_count = 0,
  'INSERT INTO mantenimientos (codigo, vehiculo_id, tipo_servicio, descripcion, kilometraje_realizado, fecha_realizada, costo, proveedor, observaciones, estado) SELECT CONCAT(''MT-'', id), vehiculo_id, COALESCE(tipo_servicio, ''Preventivo''), descripcion, km_actual, DATE(fecha), costo, proveedor, observaciones, ''Completado'' FROM mantenimiento',
  'SELECT "mantenimiento sin datos o ya migrado" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 7) usuarios: username, rol_id y admin asegurado
-- ============================================================

-- username
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'username');
SET @sql = IF(@exists = 0,
  'ALTER TABLE usuarios ADD COLUMN username VARCHAR(50) NULL AFTER nombre',
  'SELECT "username ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- UNIQUE en username
SET @uniq = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'username');
SET @sql = IF(@uniq = 0,
  'ALTER TABLE usuarios ADD UNIQUE INDEX username (username)',
  'SELECT "indice username ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- rol_id (el backend prefiere rol_id; si no existe, usa rol)
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol_id');
SET @sql = IF(@exists = 0,
  'ALTER TABLE usuarios ADD COLUMN rol_id VARCHAR(20) NULL AFTER rol',
  'SELECT "rol_id ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Copiar rol -> rol_id donde esté vacío
SET @has_rol = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol');
SET @sql = IF(@has_rol = 0,
  'SELECT "sin columna rol" AS resultado',
  'UPDATE usuarios SET rol_id = rol WHERE rol_id IS NULL AND rol IS NOT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Crear/actualizar admin
-- ⚠️  El hash de "password" fue reemplazado por migrate_seguridad.sql (contraseña temporal
--     Admin-CV-2026!Seguro que el admin debe cambiar tras el primer inicio de sesión).
INSERT INTO usuarios (nombre, username, password, email, rol_id, activo) VALUES
('Administrador', 'admin', '$2a$10$V7CE/AbrcN42kRU/6FatFe8714r4Jucve3TIcV4ibNQdSc3Bhbsji', 'admin@controlvehicular.com', 'admin', 1)
ON DUPLICATE KEY UPDATE rol_id = 'admin', activo = 1;

-- ============================================================
-- 8) SEMILLAS DE CONFIGURACIÓN
-- ============================================================
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('nombre_negocio', 'Control Vehicular', 'Nombre de la empresa'),
('ruc', '', 'RUC o identificación fiscal'),
('direccion', '', 'Dirección de la empresa'),
('telefono', '', 'Teléfono de contacto'),
('email', '', 'Email de contacto'),
('moneda', '$', 'Moneda del sistema'),
('logo_url', '', 'URL del logo del negocio'),
('total_vehiculos', '30', 'Total de vehículos en flota'),
('formato_placa', 'ABC-1234', 'Formato de placa vehicular'),
('tipos_vehiculo', 'Camioneta, Camion, Minivan', 'Tipos de vehículo permitidos'),
('intervalo_mant_km', '5000', 'Kilómetros entre mantenimientos'),
('intervalo_mant_dias', '90', 'Días entre mantenimientos'),
('alerta_combustible', '50', 'Kilómetros mínimos para alerta de combustible'),
('monitoreo_gps', 'Inactivo', 'Estado del monitoreo GPS'),
('alertas_vencimiento', 'Activas', 'Alertas de vencimiento de documentos')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- ============================================================
-- FIN — MIGRACIÓN COMPLETA APLICADA
-- ============================================================
