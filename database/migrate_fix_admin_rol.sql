-- ============================================================
-- Migración: Asegurar que el usuario admin tenga TODOS los permisos
-- Usuario: admin  /  Contraseña: password
-- Ejecutar en Aiven SQL Console
-- ============================================================

-- 1. Si la tabla solo tiene columna `rol` (ENUM) y no existe `rol_id`,
--    crearla y copiar los valores existentes
SET @has_rol_id = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol_id');

SET @sql1 = IF(@has_rol_id = 0,
  'ALTER TABLE usuarios ADD COLUMN rol_id VARCHAR(20) NULL AFTER rol',
  'SELECT "rol_id ya existe" AS resultado');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

-- 2. Copiar valores de rol -> rol_id (solo si rol_id quedó vacía)
UPDATE usuarios SET rol_id = rol WHERE rol_id IS NULL AND rol IS NOT NULL;

-- 3. Fijar el rol del admin según el tipo de columna rol_id
--    (INT -> 1, texto/ENUM -> 'admin'); el backend mapea ambos a 'admin'
SET @coltype = (SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol_id');
SET @val = IF(@coltype IN ('int','bigint','smallint','tinyint'), '1', '''admin''');
SET @sql2 = CONCAT(
  'UPDATE usuarios SET rol_id = ', @val, ', activo = 1 WHERE username = ''admin''');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 4. Crear el admin si no existe (contraseña: password) o corregir la existente
SET @val2 = @val;
SET @sql3 = CONCAT(
  'INSERT INTO usuarios (nombre, username, password, email, rol_id, activo) VALUES ',
  '(''Administrador'', ''admin'', ''$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'', ''admin@controlvehicular.com'', ', @val2, ', 1) ',
  'ON DUPLICATE KEY UPDATE rol_id = ', @val2, ', activo = 1, password = ''$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi''');
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;
