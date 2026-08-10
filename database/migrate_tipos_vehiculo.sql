-- Migración: Reducir tipos de vehículo de la flota a 3 (camioneta, camion, minivan)
-- BD desplegada: defaultdb (Aiven) o local
-- Ejecutar en MySQL Workbench seleccionando la base de datos correspondiente.
-- Se puede repetir sin problema (idempotente). NO toca las tablas de parqueo.

-- 1) Convertir los valores viejos (auto, moto, VIP, discapacitado) a 'camioneta'
UPDATE vehiculos SET tipo = 'camioneta' WHERE tipo NOT IN ('camioneta','camion','minivan');

-- 2) Cambiar el ENUM de la tabla vehiculos a los 3 nuevos tipos
ALTER TABLE vehiculos MODIFY tipo ENUM('camioneta','camion','minivan') NOT NULL DEFAULT 'camioneta';

-- 3) Actualizar el valor de configuración "tipos_vehiculo"
UPDATE configuracion SET valor = 'Camioneta, Camión, Minivan' WHERE clave = 'tipos_vehiculo';
