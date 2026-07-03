-- ============================================
-- SISTEMA CONTROL VEHICULAR
-- Esquema + Datos Iniciales (todo-en-uno)
-- ============================================
-- Importar en MySQL Workbench:
--   Server > Data Import > Import from Self-Contained File
--   O abre este archivo y ejecuta (Ctrl+Shift+Enter)
-- ============================================

DROP DATABASE IF EXISTS control_vehicular;
CREATE DATABASE control_vehicular CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE control_vehicular;

-- ==================== SEGURIDAD ====================

CREATE TABLE role (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  permisos JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  rol_id INT NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  ultimo_acceso TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES role(id)
) ENGINE=InnoDB;

CREATE TABLE sesiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  tipo ENUM('access', 'refresh') DEFAULT 'access',
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==================== VEHICULOS ====================

CREATE TABLE tipos_vehiculo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  icono VARCHAR(50) DEFAULT 'truck',
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE vehiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(20) NOT NULL UNIQUE,
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  ano INT NOT NULL,
  tipo_vehiculo_id INT NOT NULL,
  capacidad_combustible DECIMAL(10,2) COMMENT 'Capacidad del tanque en galones',
  color VARCHAR(50),
  numero_motor VARCHAR(100),
  numero_chasis VARCHAR(100),
  kilometraje_actual DECIMAL(10,2) DEFAULT 0,
  estado ENUM('Activo', 'Inactivo', 'En Mantenimiento') DEFAULT 'Activo',
  foto VARCHAR(255),
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tipo_vehiculo_id) REFERENCES tipos_vehiculo(id)
) ENGINE=InnoDB;

-- ==================== ASIGNACIONES ====================

CREATE TABLE asignaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  vehiculo_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE,
  UNIQUE KEY uk_usuario_vehiculo (usuario_id, vehiculo_id)
) ENGINE=InnoDB;

-- ==================== COMBUSTIBLE ====================

CREATE TABLE solicitudes_combustible (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  vehiculo_id INT NOT NULL,
  solicitante_id INT NOT NULL,
  galones_solicitados DECIMAL(10,2) NOT NULL,
  galones_surtidos DECIMAL(10,2) DEFAULT NULL,
  costo_total DECIMAL(12,2) DEFAULT NULL,
  precio_por_galon DECIMAL(10,2) DEFAULT NULL,
  kilometraje_actual DECIMAL(10,2) DEFAULT NULL,
  estado ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Surtida') DEFAULT 'Pendiente',
  atendido_por_id INT DEFAULT NULL,
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_atencion TIMESTAMP NULL,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
  FOREIGN KEY (atendido_por_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ==================== MANTENIMIENTO ====================

CREATE TABLE tipos_mantenimiento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  icono VARCHAR(50) DEFAULT 'wrench',
  cada_km INT DEFAULT NULL COMMENT 'Cada cuantos km se recomienda',
  cada_dias INT DEFAULT NULL COMMENT 'Cada cuantos dias se recomienda',
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE mantenimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  vehiculo_id INT NOT NULL,
  tipo_mantenimiento_id INT NOT NULL,
  descripcion TEXT,
  kilometraje_programado DECIMAL(10,2),
  kilometraje_realizado DECIMAL(10,2),
  fecha_programada DATE,
  fecha_realizada DATE,
  costo DECIMAL(12,2),
  proveedor VARCHAR(255),
  factura VARCHAR(255),
  estado ENUM('Programado', 'En Proceso', 'Completado', 'Cancelado') DEFAULT 'Programado',
  observaciones TEXT,
  atendido_por_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
  FOREIGN KEY (tipo_mantenimiento_id) REFERENCES tipos_mantenimiento(id),
  FOREIGN KEY (atendido_por_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ==================== AUDITORIA ====================

CREATE TABLE audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  accion VARCHAR(50) NOT NULL,
  tabla VARCHAR(50) NOT NULL,
  registro_id INT,
  datos_anteriores JSON,
  datos_nuevos JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==================== PROVEEDORES ====================

CREATE TABLE proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(255),
  direccion TEXT,
  tipo ENUM('Taller', 'Gasolinera', 'Repuesto', 'Otro') DEFAULT 'Otro',
  observaciones TEXT,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==================== UBICACIONES (GPS) ====================

CREATE TABLE ubicaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  usuario_id INT NOT NULL,
  latitud DECIMAL(10,7) NOT NULL,
  longitud DECIMAL(10,7) NOT NULL,
  velocidad DECIMAL(5,2) DEFAULT 0,
  direccion DECIMAL(5,2) DEFAULT 0 COMMENT 'Heading en grados',
  precision_gps DECIMAL(5,2) DEFAULT 0 COMMENT 'Precision en metros',
  bateria DECIMAL(5,2) DEFAULT NULL COMMENT 'Nivel de bateria del dispositivo',
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_ubicaciones_vehiculo (vehiculo_id),
  INDEX idx_ubicaciones_usuario (usuario_id),
  INDEX idx_ubicaciones_timestamp (timestamp),
  INDEX idx_ubicaciones_vehiculo_timestamp (vehiculo_id, timestamp)
) ENGINE=InnoDB;

-- ==================== NOTIFICACIONES ====================

CREATE TABLE notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo ENUM('info', 'success', 'warning', 'danger') DEFAULT 'info',
  leida TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- DATOS INICIALES (SEED)
-- ============================================

-- Role
INSERT INTO role (nombre, descripcion, permisos) VALUES
('Administrador', 'Control total del sistema', '{"all": true, "vehiculos": "crud", "solicitudes": "full", "mantenimientos": "crud", "usuarios": "crud", "config": "full"}'),
('Empleado', 'Acceso limitado a operaciones', '{"vehiculos": "read", "solicitudes": "create_read_own", "mantenimientos": "read", "reportes": "read"}');

-- Usuarios (passwords hasheadas con bcrypt)
-- Admin password: Admin@123
INSERT INTO usuarios (nombre, apellido, email, password, telefono, rol_id) VALUES
('Admin', 'Sistema', 'admin@controlvehicular.com', '$2b$10$UuAnuY0pNFxTTBc549LcZOoZnj1LjUt0/Fan2j3m/dQ23H5PsbD1i', '555-0100', 1);

-- Empleado password: Empleado@123
INSERT INTO usuarios (nombre, apellido, email, password, telefono, rol_id) VALUES
('Empleado', 'Prueba', 'empleado@controlvehicular.com', '$2b$10$xpQ17bKflPI11ajp0ywtieg/5zuPl.bJ6Ni1KROMKMyRCceQEObS2', '555-0101', 2);

-- Tipos de vehiculo
INSERT INTO tipos_vehiculo (nombre, descripcion, icono) VALUES
('Camioneta', 'Vehiculo tipo pickup o SUV grande', 'truck'),
('Sedan', 'Automovil de 4 puertas', 'car'),
('SUV', 'Sport Utility Vehicle', 'car'),
('Camion', 'Vehiculo de carga pesada', 'truck'),
('Van', 'Vehiculo de transporte de pasajeros', 'van'),
('Motocicleta', 'Motocicleta para entregas rapidas', 'bike');

-- Tipos de mantenimiento
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
