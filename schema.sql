-- ============================================
-- SISTEMA CONTROL VEHICULAR
-- Esquema de Base de Datos
-- ============================================

CREATE DATABASE IF NOT EXISTS control_vehicular CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
  telefono VARCHAR(500),
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
  numero_motor VARCHAR(500),
  numero_chasis VARCHAR(500),
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
  telefono VARCHAR(500),
  email VARCHAR(500),
  direccion TEXT,
  tipo ENUM('Taller', 'Gasolinera', 'Repuesto', 'Otro') DEFAULT 'Otro',
  observaciones TEXT,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
