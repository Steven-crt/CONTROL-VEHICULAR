-- Migración: Eliminar módulo de Clientes (tabla clientes y columna cliente_id de vehiculos)
-- Ejecutar en Aiven SQL Console o MySQL

-- 1. Eliminar la columna cliente_id de vehiculos si existe (y su FK)
SET @fk = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'cliente_id' LIMIT 1);

SET @sql = IF(@fk IS NOT NULL,
  CONCAT('ALTER TABLE vehiculos DROP FOREIGN KEY `', @fk, '`'),
  'SELECT "FK no existe" AS resultado');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'cliente_id');

SET @sql2 = IF(@col = 0,
  'SELECT "cliente_id ya no existe" AS resultado',
  'ALTER TABLE vehiculos DROP COLUMN cliente_id');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 2. Eliminar la tabla clientes si existe
SET @tbl = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes');

SET @sql3 = IF(@tbl = 0,
  'SELECT "tabla clientes ya no existe" AS resultado',
  'DROP TABLE clientes');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;
