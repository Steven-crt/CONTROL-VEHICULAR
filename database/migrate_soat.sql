-- Migración: Agregar información de SOAT a la tabla vehiculos
-- BD desplegada: defaultdb (Aiven)
-- Ejecutar en Aiven SQL Console. Es idempotente: si las columnas ya existen, no hace nada.

-- soat_numero
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'soat_numero');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN soat_numero VARCHAR(50) NULL AFTER anio',
  'SELECT "soat_numero ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- soat_empresa
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'soat_empresa');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN soat_empresa VARCHAR(100) NULL AFTER soat_numero',
  'SELECT "soat_empresa ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- soat_fecha_inicio
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'soat_fecha_inicio');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN soat_fecha_inicio DATE NULL AFTER soat_empresa',
  'SELECT "soat_fecha_inicio ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- soat_fecha_vencimiento
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'soat_fecha_vencimiento');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD COLUMN soat_fecha_vencimiento DATE NULL AFTER soat_fecha_inicio',
  'SELECT "soat_fecha_vencimiento ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
