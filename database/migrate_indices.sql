-- ============================================================
-- MIGRACIÓN DE ÍNDICES PARA CARGA (idempotente)
-- Sistema: CONTROL VEHICULAR (Aiven MySQL - defaultdb)
--
-- Las queries de reportes filtran/agrupan por (fecha) y por (vehículo+fecha).
-- Los índices individuales existentes (idx_sc_fecha, idx_mt_fecha,
-- idx_sc_vehiculo, idx_mt_vehiculo) no cubren el acceso combinado
-- "gastos de un vehículo en un rango de fechas".
-- Se añaden índices compuestos SIN borrar los existentes.
-- ============================================================

-- solicitudes_combustible: (vehiculo_id, fecha_solicitud)
-- Cubre: historial por vehículo + filtro de fechas + SUM de costos por vehículo
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_combustible' AND INDEX_NAME = 'idx_sc_vehiculo_fecha');
SET @sql = IF(@exists = 0,
  'ALTER TABLE solicitudes_combustible ADD INDEX idx_sc_vehiculo_fecha (vehiculo_id, fecha_solicitud)',
  'SELECT "idx_sc_vehiculo_fecha ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mantenimientos: (vehiculo_id, fecha_realizada)
-- Cubre: historial de mantenimiento por vehículo + rango de fechas + SUM de costos
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mantenimientos' AND INDEX_NAME = 'idx_mt_vehiculo_fecha');
SET @sql = IF(@exists = 0,
  'ALTER TABLE mantenimientos ADD INDEX idx_mt_vehiculo_fecha (vehiculo_id, fecha_realizada)',
  'SELECT "idx_mt_vehiculo_fecha ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mantenimientos: (tipo_servicio, fecha_realizada)
-- Cubre: "mantenimiento por tipo de servicio" del dashboard y reportes
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mantenimientos' AND INDEX_NAME = 'idx_mt_tipo_fecha');
SET @sql = IF(@exists = 0,
  'ALTER TABLE mantenimientos ADD INDEX idx_mt_tipo_fecha (tipo_servicio, fecha_realizada)',
  'SELECT "idx_mt_tipo_fecha ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vehiculos: (activo, tipo_vehiculo_id)
-- Cubre: el dashboard cuenta vehículos activos agrupando por tipo/marca/año
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehiculos' AND INDEX_NAME = 'idx_v_activo_tipo');
SET @sql = IF(@exists = 0,
  'ALTER TABLE vehiculos ADD INDEX idx_v_activo_tipo (activo, tipo_vehiculo_id)',
  'SELECT "idx_v_activo_tipo ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- FIN — ÍNDICES APLICADOS
-- ============================================================