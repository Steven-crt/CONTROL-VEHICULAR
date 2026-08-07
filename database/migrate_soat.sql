-- Migración: Agregar información de SOAT a la tabla vehiculos
-- Ejecutar en Aiven SQL Console o MySQL:  mysql -u root -p parqueo_db < database/migrate_soat.sql

USE parqueo_db;

-- Agregar columnas de SOAT si no existen
ALTER TABLE vehiculos
  ADD COLUMN soat_numero VARCHAR(50) NULL AFTER anio,
  ADD COLUMN soat_empresa VARCHAR(100) NULL AFTER soat_numero,
  ADD COLUMN soat_fecha_inicio DATE NULL AFTER soat_empresa,
  ADD COLUMN soat_fecha_vencimiento DATE NULL AFTER soat_fecha_inicio;
