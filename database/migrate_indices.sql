-- Migración: índices para consultas frecuentes (listados, historiales y reportes)
-- Patrón idempotente: no duplica índices si ya existen (como migrate_soat.sql)
-- Aplicar: mysql -h <host> -P <port> -u <user> -p <db> < migrate_indices.sql

DROP PROCEDURE IF EXISTS add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE add_index_if_missing(
  p_tabla VARCHAR(64),
  p_indice VARCHAR(64),
  p_columnas VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tabla AND INDEX_NAME = p_indice
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD INDEX `', p_indice, '` (', p_columnas, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_index_if_missing('ubicaciones', 'idx_ubic_veh_timestamp', 'vehiculo_id, timestamp');
CALL add_index_if_missing('solicitudes_combustible', 'idx_sc_veh_fecha', 'vehiculo_id, fecha_solicitud');
CALL add_index_if_missing('solicitudes_combustible', 'idx_sc_fecha', 'fecha_solicitud');
CALL add_index_if_missing('mantenimientos', 'idx_mant_veh_fecha', 'vehiculo_id, fecha_realizada');
CALL add_index_if_missing('mantenimientos', 'idx_mant_fecha', 'fecha_realizada');
CALL add_index_if_missing('vehiculos', 'idx_veh_soat_vencimiento', 'soat_fecha_vencimiento');

DROP PROCEDURE add_index_if_missing;
