-- ============================================================
-- MIGRACIÓN DE SEGURIDAD
-- Sistema: CONTROL VEHICULAR (Aiven MySQL - defaultdb)
-- 1) Tabla audit_log: registro de eventos de seguridad
-- 2) Reset del hash del admin: el hash actual en migrar_completo.sql
--    corresponde a "password" (débil y públicamente conocido).
--    El nuevo hash corresponde a la contraseña temporal:
--       Admin-CV-2026!Seguro
--    ⚠️  OBLIGATORIO: el administrador DEBE cambiar esta contraseña
--    por una personal tras el primer inicio de sesión con ella.
-- ============================================================

-- 1) TABLA: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evento VARCHAR(50) NOT NULL,
  usuario_id INT NULL,
  username VARCHAR(50) NULL,
  ip VARCHAR(45) NULL,
  metodo VARCHAR(10) NULL,
  ruta VARCHAR(255) NULL,
  detalle TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_usuario (usuario_id),
  INDEX idx_audit_evento (evento),
  INDEX idx_audit_fecha (created_at)
);

-- 2) RESET DEL HASH DEL ADMIN (era "password", débil y conocido)
UPDATE usuarios
SET password = '$2a$10$V7CE/AbrcN42kRU/6FatFe8714r4Jucve3TIcV4ibNQdSc3Bhbsji'
WHERE username = 'admin' AND activo = 1;

-- 3) AVISO: tras aplicar esta migración, inicia sesión con el admin usando
--    la contraseña temporal Admin-CV-2026!Seguro y cámbiala de inmediato.