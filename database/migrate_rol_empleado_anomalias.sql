-- ============================================================
-- MIGRACIÓN: Rol unificado 'empleado' + tabla 'anomalias'
-- Sistema: CONTROL VEHICULAR (Aiven MySQL - defaultdb / local - parqueo_db)
--
-- 1) Unifica roles: todo lo que no sea admin (rol_id=1) -> empleado (rol_id=2)
--    Esquema real de usuarios: `rol_id INT` (1=admin, 2=empleado).
-- 2) Crea la tabla `anomalias` para reportes de anomalías
-- 3) Agrega `solicitante_id` a `mantenimientos` (trazar quién pidió)
--
-- Idempotente: se puede ejecutar varias veces sin dañar datos.
-- Compatible con Render + Aiven: no toca configuración de conexión.
-- ============================================================

-- ------------------------------------------------------------
-- 1) NORMALIZAR ROL_ID (INT): 1=admin, todo lo demás -> 2=empleado
-- ------------------------------------------------------------
UPDATE usuarios SET rol_id = 2 WHERE rol_id IS NULL OR rol_id <> 1;

-- Instalaciones antiguas con columna texto `rol`: normalizar si existe
SET @has_rol_texto = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol');

SET @sql_rol = IF(@has_rol_texto > 0,
  'UPDATE usuarios SET rol = ''empleado'' WHERE rol IN (''operador'', ''cajero'', ''2'', ''3'')',
  'SELECT "sin columna rol texto" AS resultado');
PREPARE stmt FROM @sql_rol; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2) TABLA anomalias
-- ------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3) COLUMNAS DE TRAZABILIDAD EN mantenimientos
-- ------------------------------------------------------------
SET @has_sol_mant = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mantenimientos' AND COLUMN_NAME = 'solicitante_id');

SET @sql_e = IF(@has_sol_mant = 0,
  'ALTER TABLE mantenimientos ADD COLUMN solicitante_id INT NULL AFTER observaciones',
  'SELECT "solicitante_id ya existe" AS resultado');
PREPARE stmt FROM @sql_e; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4) VOCABULARIO DE ESTADOS EN mantenimientos
--    La app usa Pendiente/Completado/Rechazado; el ENUM legacy
--    tenia Programado/En Proceso/Cancelado.
-- ------------------------------------------------------------
UPDATE mantenimientos SET estado = 'Pendiente'  WHERE estado = 'Programado';
UPDATE mantenimientos SET estado = 'Completado' WHERE estado IN ('En Proceso', 'Finalizado');
UPDATE mantenimientos SET estado = 'Rechazado'  WHERE estado = 'Cancelado';
ALTER TABLE mantenimientos MODIFY COLUMN estado ENUM('Pendiente','Completado','Rechazado') NOT NULL DEFAULT 'Pendiente';

-- ------------------------------------------------------------
-- 5) NOTIFICACIONES VISTAS POR USUARIO (badge dinamico)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones_vistas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  clave VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif_vista (usuario_id, clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
