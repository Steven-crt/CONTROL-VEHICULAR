-- ============================================
-- SISTEMA CONTROL VEHICULAR
-- Datos Iniciales (Seed)
-- ============================================

USE control_vehicular;

-- ==================== ROLES ====================
INSERT INTO role (nombre, descripcion, permisos) VALUES
('Administrador', 'Control total del sistema', '{"all": true, "vehiculos": "crud", "solicitudes": "full", "mantenimientos": "crud", "usuarios": "crud", "config": "full"}'),
('Empleado', 'Acceso limitado a operaciones', '{"vehiculos": "read", "solicitudes": "create_read_own", "mantenimientos": "read", "reportes": "read"}');

-- ==================== USUARIOS ====================
-- Password: Admin@123 (bcrypt hash)
INSERT INTO usuarios (nombre, apellido, email, password, telefono, rol_id) VALUES
('Admin', 'Sistema', 'admin@controlvehicular.com', '$2b$10$UuAnuY0pNFxTTBc549LcZOoZnj1LjUt0/Fan2j3m/dQ23H5PsbD1i', '555-0100', 1);

-- Password: Empleado@123 (bcrypt hash)
INSERT INTO usuarios (nombre, apellido, email, password, telefono, rol_id) VALUES
('Empleado', 'Prueba', 'empleado@controlvehicular.com', '$2b$10$xpQ17bKflPI11ajp0ywtieg/5zuPl.bJ6Ni1KROMKMyRCceQEObS2', '555-0101', 2);

-- ==================== TIPOS DE VEHICULO ====================
INSERT INTO tipos_vehiculo (nombre, descripcion, icono) VALUES
('Camioneta', 'Vehiculo tipo pickup o SUV grande', 'truck'),
('Sedan', 'Automovil de 4 puertas', 'car'),
('SUV', 'Sport Utility Vehicle', 'car'),
('Camion', 'Vehiculo de carga pesada', 'truck'),
('Van', 'Vehiculo de transporte de pasajeros', 'van'),
('Motocicleta', 'Motocicleta para entregas rapidas', 'bike');

-- ==================== TIPOS DE MANTENIMIENTO ====================
INSERT INTO tipos_mantenimiento (nombre, descripcion, icono, cada_km, cada_dias) VALUES
('Cambio de Aceite', 'Cambio de aceite del motor y filtro', 'droplet', 5000, 180),
('Frenos', 'Revision y cambio de pastillas/discos de freno', 'circle-slash', 10000, 365),
('Llantas', 'Rotacion, balanceo o cambio de llantas', 'circle', 15000, 365),
('Bateria', 'Revision y cambio de bateria', 'battery-charging', NULL, 730),
('Sistema Electrico', 'Revision de sistema electrico general', 'zap', NULL, 365),
('Motor', 'Mantenimiento del motor', 'settings', 20000, 730),
('Suspension', 'Revision de amortiguadores y suspension', 'chevrons-up', 20000, 365),
('Transmision', 'Cambio de aceite de transmision', 'shuffle', 40000, 730),
('Refrigeracion', 'Revision del sistema de refrigeracion', 'thermometer', 30000, 365),
('Otro', 'Otros tipos de mantenimiento', 'wrench', NULL, NULL);
