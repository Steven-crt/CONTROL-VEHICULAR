-- Migración: Agregar columna username a tabla usuarios
-- Ejecutar en Aiven SQL Console

-- 1. Agregar columna username si no existe
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'username');

SET @sql = IF(@exists = 0, 
  'ALTER TABLE usuarios ADD COLUMN username VARCHAR(50) AFTER nombre', 
  'SELECT "username ya existe" AS resultado');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Agregar UNIQUE constraint si no existe
SET @uniq = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'username');

SET @sql2 = IF(@uniq = 0,
  'ALTER TABLE usuarios ADD UNIQUE INDEX username (username)',
  'SELECT "INDEX ya existe" AS resultado');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. Actualizar usuario admin existente
UPDATE usuarios SET username = 'admin' WHERE username IS NULL OR username = '' LIMIT 1;

-- 4. Insertar admin si no existe
INSERT IGNORE INTO usuarios (nombre, username, password, email, rol, activo) VALUES
('Administrador', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@controlvehicular.com', 'admin', 1);
