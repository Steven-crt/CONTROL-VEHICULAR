-- ============================================================
-- SISTEMA DE GESTIÓN DE PARQUEO
-- Base de Datos: parqueo_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS parqueo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parqueo_db;

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  rol ENUM('admin', 'operador', 'cajero') NOT NULL DEFAULT 'operador',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: configuracion
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  descripcion VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: zonas
-- ============================================================
CREATE TABLE IF NOT EXISTS zonas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  piso INT DEFAULT 1,
  descripcion VARCHAR(200),
  activo TINYINT(1) DEFAULT 1
);

-- ============================================================
-- TABLA: espacios
-- ============================================================
CREATE TABLE IF NOT EXISTS espacios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(10) NOT NULL,
  zona_id INT,
  tipo ENUM('auto', 'moto', 'discapacitado', 'VIP') NOT NULL DEFAULT 'auto',
  estado ENUM('libre', 'ocupado', 'mantenimiento') NOT NULL DEFAULT 'libre',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id) REFERENCES zonas(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: tarifas
-- ============================================================
CREATE TABLE IF NOT EXISTS tarifas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_vehiculo ENUM('auto', 'moto', 'discapacitado', 'VIP') NOT NULL,
  modalidad ENUM('hora', 'fraccion', 'dia', 'mensual') NOT NULL DEFAULT 'hora',
  precio DECIMAL(10,2) NOT NULL,
  tiempo_gracia INT DEFAULT 10,
  descripcion VARCHAR(200),
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: clientes (abonados / frecuentes)
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cedula VARCHAR(20) UNIQUE,
  telefono VARCHAR(20),
  email VARCHAR(100),
  placa VARCHAR(20),
  tipo_membresia ENUM('ninguna', 'mensual', 'anual') DEFAULT 'ninguna',
  fecha_inicio DATE,
  fecha_vencimiento DATE,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: vehiculos
-- ============================================================
CREATE TABLE IF NOT EXISTS vehiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(20) NOT NULL,
  tipo ENUM('auto', 'moto', 'discapacitado', 'VIP') NOT NULL DEFAULT 'auto',
  color VARCHAR(50),
  marca VARCHAR(50),
  modelo VARCHAR(50),
  anio INT,
  cliente_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: tickets (entradas y salidas)
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  placa VARCHAR(20) NOT NULL,
  tipo_vehiculo ENUM('auto', 'moto', 'discapacitado', 'VIP') NOT NULL DEFAULT 'auto',
  espacio_id INT,
  usuario_entrada_id INT,
  usuario_salida_id INT,
  hora_entrada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hora_salida DATETIME,
  tiempo_minutos INT,
  tarifa_aplicada DECIMAL(10,2),
  monto_cobrar DECIMAL(10,2),
  descuento DECIMAL(10,2) DEFAULT 0,
  estado ENUM('activo', 'cerrado', 'anulado') NOT NULL DEFAULT 'activo',
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (espacio_id) REFERENCES espacios(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_entrada_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_salida_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: pagos
-- ============================================================
CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  usuario_id INT,
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago ENUM('efectivo', 'tarjeta', 'QR', 'transferencia') NOT NULL DEFAULT 'efectivo',
  monto_recibido DECIMAL(10,2),
  cambio DECIMAL(10,2) DEFAULT 0,
  referencia VARCHAR(100),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: combustible (Control de combustible)
-- ============================================================
CREATE TABLE IF NOT EXISTS combustible (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  fecha_carga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  litros DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  costo_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  km_actual INT NOT NULL DEFAULT 0,
  tipo_combustible ENUM('Gasolina', 'Diésel', 'Gas', 'Eléctrico', 'Híbrido') NOT NULL DEFAULT 'Gasolina',
  ubicacion_gps VARCHAR(100),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: mantenimiento (Historial de mantenimiento)
-- ============================================================
CREATE TABLE IF NOT EXISTS mantenimiento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo_servicio ENUM('Preventivo', 'Correctivo') NOT NULL DEFAULT 'Preventivo',
  descripcion TEXT,
  km_actual INT NOT NULL DEFAULT 0,
  costo DECIMAL(10,2) NOT NULL DEFAULT 0,
  proveedor VARCHAR(100),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: ubicaciones (Histórico GPS)
-- ============================================================
CREATE TABLE IF NOT EXISTS ubicaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  latitud DECIMAL(10,8) NOT NULL,
  longitud DECIMAL(11,8) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: kilometraje_manual (Lecturas manuales de KM)
-- ============================================================
CREATE TABLE IF NOT EXISTS kilometraje_manual (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  km_actual INT NOT NULL,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: cierres_caja
-- ============================================================
CREATE TABLE IF NOT EXISTS cierres_caja (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  fecha_inicio DATETIME NOT NULL,
  fecha_cierre DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_vehiculos INT DEFAULT 0,
  total_efectivo DECIMAL(10,2) DEFAULT 0,
  total_tarjeta DECIMAL(10,2) DEFAULT 0,
  total_qr DECIMAL(10,2) DEFAULT 0,
  total_general DECIMAL(10,2) DEFAULT 0,
  observaciones TEXT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ============================================================
-- DATOS SEMILLA: configuracion
-- ============================================================
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('nombre_negocio', 'Control Vehicular', 'Nombre de la empresa'),
('ruc', '1234567890001', 'RUC o identificación fiscal'),
('direccion', 'Av. Principal 123', 'Dirección de la empresa'),
('telefono', '0999999999', 'Teléfono de contacto'),
('email', 'info@controlvehicular.com', 'Email de contacto'),
('moneda', 'USD', 'Moneda del sistema'),
('logo_url', '', 'URL del logo del negocio'),
('total_vehiculos', '30', 'Total de vehículos en flota'),
('formato_placa', 'ABC-1234', 'Formato de placa vehicular'),
('tipos_vehiculo', 'Auto, Moto, Camioneta, Bus', 'Tipos de vehículo permitidos'),
('intervalo_mant_km', '5000', 'Kilómetros entre mantenimientos'),
('intervalo_mant_dias', '90', 'Días entre mantenimientos'),
('alerta_combustible', '50', 'Kilómetros mínimos para alerta de combustible'),
('monitoreo_gps', 'Activo', 'Estado del monitoreo GPS'),
('alertas_vencimiento', 'Activas', 'Alertas de vencimiento de documentos')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- ============================================================
-- DATOS SEMILLA: zonas
-- ============================================================
INSERT INTO zonas (nombre, piso, descripcion) VALUES
('Zona A', 1, 'Planta baja - Autos'),
('Zona B', 1, 'Planta baja - Motos'),
('Zona C', 2, 'Segundo piso - Autos'),
('Zona VIP', 1, 'Zona VIP y discapacitados');

-- ============================================================
-- DATOS SEMILLA: espacios (50 espacios)
-- ============================================================
-- Zona A: A01-A20 (autos)
INSERT INTO espacios (numero, zona_id, tipo, estado) VALUES
('A01', 1, 'auto', 'libre'), ('A02', 1, 'auto', 'libre'), ('A03', 1, 'auto', 'libre'),
('A04', 1, 'auto', 'libre'), ('A05', 1, 'auto', 'libre'), ('A06', 1, 'auto', 'libre'),
('A07', 1, 'auto', 'libre'), ('A08', 1, 'auto', 'libre'), ('A09', 1, 'auto', 'libre'),
('A10', 1, 'auto', 'libre'), ('A11', 1, 'auto', 'libre'), ('A12', 1, 'auto', 'libre'),
('A13', 1, 'auto', 'libre'), ('A14', 1, 'auto', 'libre'), ('A15', 1, 'auto', 'libre'),
('A16', 1, 'auto', 'libre'), ('A17', 1, 'auto', 'libre'), ('A18', 1, 'auto', 'libre'),
('A19', 1, 'auto', 'libre'), ('A20', 1, 'auto', 'libre');
-- Zona B: B01-B10 (motos)
INSERT INTO espacios (numero, zona_id, tipo, estado) VALUES
('B01', 2, 'moto', 'libre'), ('B02', 2, 'moto', 'libre'), ('B03', 2, 'moto', 'libre'),
('B04', 2, 'moto', 'libre'), ('B05', 2, 'moto', 'libre'), ('B06', 2, 'moto', 'libre'),
('B07', 2, 'moto', 'libre'), ('B08', 2, 'moto', 'libre'), ('B09', 2, 'moto', 'libre'),
('B10', 2, 'moto', 'libre');
-- Zona C: C01-C15 (autos piso 2)
INSERT INTO espacios (numero, zona_id, tipo, estado) VALUES
('C01', 3, 'auto', 'libre'), ('C02', 3, 'auto', 'libre'), ('C03', 3, 'auto', 'libre'),
('C04', 3, 'auto', 'libre'), ('C05', 3, 'auto', 'libre'), ('C06', 3, 'auto', 'libre'),
('C07', 3, 'auto', 'libre'), ('C08', 3, 'auto', 'libre'), ('C09', 3, 'auto', 'libre'),
('C10', 3, 'auto', 'libre'), ('C11', 3, 'auto', 'libre'), ('C12', 3, 'auto', 'libre'),
('C13', 3, 'auto', 'libre'), ('C14', 3, 'auto', 'libre'), ('C15', 3, 'auto', 'libre');
-- Zona VIP: V01-V05 (VIP) + D01-D05 (discapacitados)
INSERT INTO espacios (numero, zona_id, tipo, estado) VALUES
('V01', 4, 'VIP', 'libre'), ('V02', 4, 'VIP', 'libre'), ('V03', 4, 'VIP', 'libre'),
('V04', 4, 'VIP', 'libre'), ('V05', 4, 'VIP', 'libre'),
('D01', 4, 'discapacitado', 'libre'), ('D02', 4, 'discapacitado', 'libre'),
('D03', 4, 'discapacitado', 'libre'), ('D04', 4, 'discapacitado', 'libre'),
('D05', 4, 'discapacitado', 'libre');

-- ============================================================
-- DATOS SEMILLA: tarifas
-- ============================================================
INSERT INTO tarifas (tipo_vehiculo, modalidad, precio, tiempo_gracia, descripcion) VALUES
('auto', 'hora', 1.00, 10, 'Auto - tarifa por hora'),
('auto', 'dia', 8.00, 10, 'Auto - tarifa día completo'),
('auto', 'mensual', 60.00, 0, 'Auto - abono mensual'),
('moto', 'hora', 0.50, 10, 'Moto - tarifa por hora'),
('moto', 'dia', 4.00, 10, 'Moto - tarifa día completo'),
('moto', 'mensual', 30.00, 0, 'Moto - abono mensual'),
('VIP', 'hora', 2.00, 15, 'VIP - tarifa por hora'),
('VIP', 'mensual', 120.00, 0, 'VIP - abono mensual'),
('discapacitado', 'hora', 0.00, 60, 'Discapacitado - acceso libre');

-- ============================================================
-- DATOS SEMILLA: usuario admin
-- password: admin123 (bcrypt $2b$10$...)
-- ============================================================
INSERT INTO usuarios (nombre, username, password, email, rol) VALUES
('Administrador', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@parksmart.com', 'admin'),
('Operador 1', 'operador1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'operador@parksmart.com', 'operador'),
('Cajero 1', 'cajero1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cajero@parksmart.com', 'cajero')
ON DUPLICATE KEY UPDATE nombre = nombre;
