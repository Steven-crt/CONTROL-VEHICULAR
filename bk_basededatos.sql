-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         8.4.3 - MySQL Community Server - GPL
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para parqueo_db
CREATE DATABASE IF NOT EXISTS `parqueo_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `parqueo_db`;

-- Volcando estructura para tabla parqueo_db.cierres_caja
CREATE TABLE IF NOT EXISTS `cierres_caja` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_cierre` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_vehiculos` int DEFAULT '0',
  `total_efectivo` decimal(10,2) DEFAULT '0.00',
  `total_tarjeta` decimal(10,2) DEFAULT '0.00',
  `total_qr` decimal(10,2) DEFAULT '0.00',
  `total_general` decimal(10,2) DEFAULT '0.00',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `cierres_caja_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.cierres_caja: ~7 rows (aproximadamente)
DELETE FROM `cierres_caja`;
INSERT INTO `cierres_caja` (`id`, `usuario_id`, `fecha_inicio`, `fecha_cierre`, `total_vehiculos`, `total_efectivo`, `total_tarjeta`, `total_qr`, `total_general`, `observaciones`) VALUES
	(1, 1, '2026-03-15 00:00:00', '2026-03-15 00:00:00', 18, 3.04, 18.61, 4.58, 65.88, NULL),
	(2, 1, '2026-03-16 00:00:00', '2026-03-16 00:00:00', 15, 15.43, 0.65, 6.87, 60.92, NULL),
	(3, 1, '2026-03-17 00:00:00', '2026-03-17 00:00:00', 10, 11.90, 4.92, 1.54, 69.04, NULL),
	(4, 1, '2026-03-18 00:00:00', '2026-03-18 00:00:00', 16, 4.16, 1.27, 9.88, 41.38, NULL),
	(5, 1, '2026-03-19 00:00:00', '2026-03-19 00:00:00', 18, 0.95, 17.79, 4.63, 35.12, NULL),
	(6, 1, '2026-03-20 00:00:00', '2026-03-20 00:00:00', 15, 1.99, 5.98, 7.17, 66.42, NULL),
	(7, 1, '2026-03-21 00:00:00', '2026-03-21 00:00:00', 8, 4.09, 15.49, 9.65, 33.39, NULL);

-- Volcando estructura para tabla parqueo_db.clientes
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cedula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `placa` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_membresia` enum('ninguna','mensual','anual') COLLATE utf8mb4_unicode_ci DEFAULT 'ninguna',
  `fecha_inicio` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cedula` (`cedula`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.clientes: ~10 rows (aproximadamente)
DELETE FROM `clientes`;
INSERT INTO `clientes` (`id`, `nombre`, `cedula`, `telefono`, `email`, `placa`, `tipo_membresia`, `fecha_inicio`, `fecha_vencimiento`, `activo`, `created_at`, `updated_at`) VALUES
	(51, 'Cliente Premium 1', '0992899057', '099932040', 'cliente1@mail.com', 'ABC-101', 'mensual', '2026-03-19', '2026-04-19', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(52, 'Cliente Premium 2', '0920257291', '099756485', 'cliente2@mail.com', 'ABC-102', 'mensual', '2026-03-21', '2026-04-21', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(53, 'Cliente Premium 3', '0921747829', '099948815', 'cliente3@mail.com', 'ABC-103', 'mensual', '2026-03-13', '2026-04-13', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(54, 'Cliente Premium 4', '0972101431', '099841177', 'cliente4@mail.com', 'ABC-104', 'mensual', '2026-03-20', '2026-04-20', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(55, 'Cliente Premium 5', '098919191', '099606302', 'cliente5@mail.com', 'ABC-105', 'mensual', '2026-03-19', '2026-04-19', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(56, 'Cliente Premium 6', '0966059', '09966148', 'cliente6@mail.com', 'ABC-106', 'mensual', '2026-03-20', '2026-04-20', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(57, 'Cliente Premium 7', '0955517275', '099314683', 'cliente7@mail.com', 'ABC-107', 'mensual', '2026-03-21', '2026-04-21', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(58, 'Cliente Premium 8', '0975392944', '09943016', 'cliente8@mail.com', 'ABC-108', 'mensual', '2026-03-21', '2026-04-21', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(59, 'Cliente Premium 9', '0944624113', '099451360', 'cliente9@mail.com', 'ABC-109', 'mensual', '2026-03-16', '2026-04-16', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(60, 'Cliente Premium 10', '0997415201', '099148496', 'cliente10@mail.com', 'ABC-100', 'mensual', '2026-03-13', '2026-04-13', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27');

-- Volcando estructura para tabla parqueo_db.configuracion
CREATE TABLE IF NOT EXISTS `configuracion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.configuracion: ~9 rows (aproximadamente)
DELETE FROM `configuracion`;
INSERT INTO `configuracion` (`id`, `clave`, `valor`, `descripcion`, `updated_at`) VALUES
	(1, 'nombre_negocio', 'ParkSmart Pro', 'Nombre del parqueo', '2026-03-21 06:57:37'),
	(2, 'ruc', '1234567890001', 'RUC o identificaci├│n fiscal', '2026-03-21 06:57:37'),
	(3, 'direccion', 'Av. Principal 123', 'Direcci├│n del parqueo', '2026-03-21 06:57:37'),
	(4, 'telefono', '0999999999', 'Tel├®fono de contacto', '2026-03-21 06:57:37'),
	(5, 'email', 'info@parksmart.com', 'Email de contacto', '2026-03-21 06:57:37'),
	(6, 'capacidad_total', '50', 'Total de espacios', '2026-03-21 06:57:37'),
	(7, 'tiempo_gracia', '10', 'Minutos de gracia sin cobro', '2026-03-21 06:57:37'),
	(8, 'moneda', 'S/', 'Moneda del sistema', '2026-03-21 07:21:38'),
	(9, 'logo_url', '', 'URL del logo del negocio', '2026-03-21 06:57:37');

-- Volcando estructura para tabla parqueo_db.espacios
CREATE TABLE IF NOT EXISTS `espacios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zona_id` int DEFAULT NULL,
  `tipo` enum('auto','moto','discapacitado','VIP') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `estado` enum('libre','ocupado','mantenimiento') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'libre',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `zona_id` (`zona_id`),
  CONSTRAINT `espacios_ibfk_1` FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.espacios: ~55 rows (aproximadamente)
DELETE FROM `espacios`;
INSERT INTO `espacios` (`id`, `numero`, `zona_id`, `tipo`, `estado`, `created_at`) VALUES
	(1, 'A01', 1, 'auto', 'ocupado', '2026-03-21 06:57:37'),
	(2, 'A02', 1, 'auto', 'ocupado', '2026-03-21 06:57:37'),
	(3, 'A03', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(4, 'A04', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(5, 'A05', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(6, 'A06', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(7, 'A07', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(8, 'A08', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(9, 'A09', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(10, 'A10', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(11, 'A11', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(12, 'A12', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(13, 'A13', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(14, 'A14', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(15, 'A15', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(16, 'A16', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(17, 'A17', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(18, 'A18', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(19, 'A19', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(20, 'A20', 1, 'auto', 'libre', '2026-03-21 06:57:37'),
	(21, 'B01', 2, 'moto', 'ocupado', '2026-03-21 06:57:37'),
	(22, 'B02', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(23, 'B03', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(24, 'B04', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(25, 'B05', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(26, 'B06', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(27, 'B07', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(28, 'B08', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(29, 'B09', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(30, 'B10', 2, 'moto', 'libre', '2026-03-21 06:57:37'),
	(31, 'C01', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(32, 'C02', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(33, 'C03', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(34, 'C04', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(35, 'C05', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(36, 'C06', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(37, 'C07', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(38, 'C08', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(39, 'C09', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(40, 'C10', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(41, 'C11', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(42, 'C12', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(43, 'C13', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(44, 'C14', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(45, 'C15', 3, 'auto', 'libre', '2026-03-21 06:57:37'),
	(46, 'V01', 4, 'VIP', 'libre', '2026-03-21 06:57:37'),
	(47, 'V02', 4, 'VIP', 'libre', '2026-03-21 06:57:37'),
	(48, 'V03', 4, 'VIP', 'libre', '2026-03-21 06:57:37'),
	(49, 'V04', 4, 'VIP', 'libre', '2026-03-21 06:57:37'),
	(50, 'V05', 4, 'VIP', 'libre', '2026-03-21 06:57:37'),
	(51, 'D01', 4, 'discapacitado', 'ocupado', '2026-03-21 06:57:37'),
	(52, 'D02', 4, 'discapacitado', 'ocupado', '2026-03-21 06:57:37'),
	(53, 'D03', 4, 'discapacitado', 'ocupado', '2026-03-21 06:57:37'),
	(54, 'D04', 4, 'discapacitado', 'libre', '2026-03-21 06:57:37'),
	(55, 'D05', 4, 'discapacitado', 'libre', '2026-03-21 06:57:37');

-- Volcando estructura para tabla parqueo_db.pagos
CREATE TABLE IF NOT EXISTS `pagos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `metodo_pago` enum('efectivo','tarjeta','QR','transferencia') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'efectivo',
  `monto_recibido` decimal(10,2) DEFAULT NULL,
  `cambio` decimal(10,2) DEFAULT '0.00',
  `referencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_pago` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
  CONSTRAINT `pagos_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.pagos: ~93 rows (aproximadamente)
DELETE FROM `pagos`;
INSERT INTO `pagos` (`id`, `ticket_id`, `usuario_id`, `monto`, `metodo_pago`, `monto_recibido`, `cambio`, `referencia`, `fecha_pago`) VALUES
	(1, 1, 1, 1.63, 'QR', NULL, 0.00, NULL, '2026-03-14 10:36:00'),
	(2, 2, 1, 3.34, 'efectivo', NULL, 0.00, NULL, '2026-03-14 15:25:00'),
	(3, 3, 1, 1.33, 'tarjeta', NULL, 0.00, NULL, '2026-03-14 13:15:00'),
	(4, 4, 1, 2.83, 'efectivo', NULL, 0.00, NULL, '2026-03-14 14:20:00'),
	(5, 5, 1, 1.49, 'efectivo', NULL, 0.00, NULL, '2026-03-14 18:08:00'),
	(6, 6, 1, 2.29, 'QR', NULL, 0.00, NULL, '2026-03-14 19:55:00'),
	(7, 7, 1, 3.85, 'tarjeta', NULL, 0.00, NULL, '2026-03-14 16:43:00'),
	(8, 8, 1, 2.15, 'efectivo', NULL, 0.00, NULL, '2026-03-14 15:24:00'),
	(9, 9, 1, 1.96, 'QR', NULL, 0.00, NULL, '2026-03-14 11:04:00'),
	(10, 10, 1, 1.94, 'efectivo', NULL, 0.00, NULL, '2026-03-14 19:40:00'),
	(11, 11, 1, 2.72, 'tarjeta', NULL, 0.00, NULL, '2026-03-14 19:03:00'),
	(12, 12, 1, 1.71, 'efectivo', NULL, 0.00, NULL, '2026-03-14 14:03:00'),
	(13, 13, 1, 2.58, 'tarjeta', NULL, 0.00, NULL, '2026-03-14 14:40:00'),
	(14, 14, 1, 2.28, 'QR', NULL, 0.00, NULL, '2026-03-14 09:10:00'),
	(15, 15, 1, 1.61, 'efectivo', NULL, 0.00, NULL, '2026-03-14 20:05:00'),
	(16, 16, 1, 1.47, 'tarjeta', NULL, 0.00, NULL, '2026-03-14 09:23:00'),
	(17, 17, 1, 3.75, 'tarjeta', NULL, 0.00, NULL, '2026-03-14 18:49:00'),
	(18, 18, 1, 2.45, 'efectivo', NULL, 0.00, NULL, '2026-03-15 16:32:00'),
	(19, 19, 1, 2.64, 'QR', NULL, 0.00, NULL, '2026-03-15 17:11:00'),
	(20, 20, 1, 1.71, 'tarjeta', NULL, 0.00, NULL, '2026-03-15 12:33:00'),
	(21, 21, 1, 1.30, 'efectivo', NULL, 0.00, NULL, '2026-03-15 14:53:00'),
	(22, 22, 1, 1.35, 'efectivo', NULL, 0.00, NULL, '2026-03-15 12:50:00'),
	(23, 23, 1, 2.95, 'QR', NULL, 0.00, NULL, '2026-03-15 16:08:00'),
	(24, 24, 1, 1.53, 'efectivo', NULL, 0.00, NULL, '2026-03-15 19:13:00'),
	(25, 25, 1, 3.10, 'efectivo', NULL, 0.00, NULL, '2026-03-15 17:57:00'),
	(26, 26, 1, 3.35, 'tarjeta', NULL, 0.00, NULL, '2026-03-15 12:58:00'),
	(27, 27, 1, 2.60, 'tarjeta', NULL, 0.00, NULL, '2026-03-15 16:13:00'),
	(28, 28, 1, 1.93, 'efectivo', NULL, 0.00, NULL, '2026-03-15 10:30:00'),
	(29, 29, 1, 1.46, 'efectivo', NULL, 0.00, NULL, '2026-03-15 12:17:00'),
	(30, 30, 1, 2.19, 'QR', NULL, 0.00, NULL, '2026-03-15 12:03:00'),
	(31, 31, 1, 1.89, 'QR', NULL, 0.00, NULL, '2026-03-15 12:30:00'),
	(32, 32, 1, 3.27, 'tarjeta', NULL, 0.00, NULL, '2026-03-15 14:42:00'),
	(33, 33, 1, 1.23, 'QR', NULL, 0.00, NULL, '2026-03-16 10:55:01'),
	(34, 34, 1, 2.23, 'QR', NULL, 0.00, NULL, '2026-03-16 18:03:01'),
	(35, 35, 1, 1.98, 'QR', NULL, 0.00, NULL, '2026-03-16 13:42:01'),
	(36, 36, 1, 1.50, 'tarjeta', NULL, 0.00, NULL, '2026-03-16 17:46:01'),
	(37, 37, 1, 2.65, 'tarjeta', NULL, 0.00, NULL, '2026-03-16 20:20:01'),
	(38, 38, 1, 1.11, 'tarjeta', NULL, 0.00, NULL, '2026-03-17 10:20:01'),
	(39, 39, 1, 3.67, 'QR', NULL, 0.00, NULL, '2026-03-17 14:44:01'),
	(40, 40, 1, 3.05, 'efectivo', NULL, 0.00, NULL, '2026-03-17 09:15:01'),
	(41, 41, 1, 2.74, 'efectivo', NULL, 0.00, NULL, '2026-03-17 19:58:01'),
	(42, 42, 1, 3.18, 'efectivo', NULL, 0.00, NULL, '2026-03-17 13:44:01'),
	(43, 43, 1, 1.38, 'QR', NULL, 0.00, NULL, '2026-03-17 12:09:01'),
	(44, 44, 1, 2.97, 'efectivo', NULL, 0.00, NULL, '2026-03-17 20:07:01'),
	(45, 45, 1, 1.44, 'QR', NULL, 0.00, NULL, '2026-03-17 16:05:01'),
	(46, 46, 1, 2.73, 'QR', NULL, 0.00, NULL, '2026-03-17 14:45:01'),
	(47, 47, 1, 2.92, 'efectivo', NULL, 0.00, NULL, '2026-03-17 18:12:01'),
	(48, 48, 1, 3.79, 'efectivo', NULL, 0.00, NULL, '2026-03-17 12:33:01'),
	(49, 49, 1, 2.83, 'efectivo', NULL, 0.00, NULL, '2026-03-17 11:48:01'),
	(50, 50, 1, 2.62, 'tarjeta', NULL, 0.00, NULL, '2026-03-17 16:06:01'),
	(51, 51, 1, 2.91, 'efectivo', NULL, 0.00, NULL, '2026-03-17 17:02:01'),
	(52, 52, 1, 3.76, 'QR', NULL, 0.00, NULL, '2026-03-17 16:36:01'),
	(53, 53, 1, 3.79, 'tarjeta', NULL, 0.00, NULL, '2026-03-17 09:51:01'),
	(54, 54, 1, 2.07, 'QR', NULL, 0.00, NULL, '2026-03-18 17:36:01'),
	(55, 55, 1, 1.57, 'efectivo', NULL, 0.00, NULL, '2026-03-18 13:44:01'),
	(56, 56, 1, 1.94, 'tarjeta', NULL, 0.00, NULL, '2026-03-18 16:30:01'),
	(57, 57, 1, 3.80, 'tarjeta', NULL, 0.00, NULL, '2026-03-18 12:26:01'),
	(58, 58, 1, 3.06, 'efectivo', NULL, 0.00, NULL, '2026-03-18 10:52:01'),
	(59, 59, 1, 1.93, 'QR', NULL, 0.00, NULL, '2026-03-18 13:57:01'),
	(60, 60, 1, 3.94, 'efectivo', NULL, 0.00, NULL, '2026-03-18 14:15:01'),
	(61, 61, 1, 2.68, 'QR', NULL, 0.00, NULL, '2026-03-19 17:03:01'),
	(62, 62, 1, 2.38, 'efectivo', NULL, 0.00, NULL, '2026-03-19 16:57:01'),
	(63, 63, 1, 1.50, 'QR', NULL, 0.00, NULL, '2026-03-19 17:43:01'),
	(64, 64, 1, 1.77, 'QR', NULL, 0.00, NULL, '2026-03-19 14:08:01'),
	(65, 65, 1, 2.10, 'QR', NULL, 0.00, NULL, '2026-03-19 18:38:01'),
	(66, 66, 1, 3.19, 'tarjeta', NULL, 0.00, NULL, '2026-03-19 14:45:01'),
	(67, 67, 1, 1.23, 'efectivo', NULL, 0.00, NULL, '2026-03-19 18:16:01'),
	(68, 68, 1, 2.94, 'tarjeta', NULL, 0.00, NULL, '2026-03-19 14:01:01'),
	(69, 69, 1, 3.36, 'tarjeta', NULL, 0.00, NULL, '2026-03-19 09:51:01'),
	(70, 70, 1, 2.15, 'QR', NULL, 0.00, NULL, '2026-03-19 14:18:01'),
	(71, 71, 1, 3.70, 'tarjeta', NULL, 0.00, NULL, '2026-03-19 18:36:01'),
	(72, 72, 1, 3.61, 'efectivo', NULL, 0.00, NULL, '2026-03-19 18:40:01'),
	(73, 73, 1, 3.86, 'QR', NULL, 0.00, NULL, '2026-03-19 13:15:01'),
	(74, 74, 1, 1.99, 'QR', NULL, 0.00, NULL, '2026-03-19 19:13:01'),
	(75, 75, 1, 1.78, 'efectivo', NULL, 0.00, NULL, '2026-03-19 14:12:01'),
	(76, 76, 1, 3.92, 'efectivo', NULL, 0.00, NULL, '2026-03-19 18:31:01'),
	(77, 77, 1, 1.20, 'efectivo', NULL, 0.00, NULL, '2026-03-19 19:26:01'),
	(78, 78, 1, 3.26, 'tarjeta', NULL, 0.00, NULL, '2026-03-19 17:36:01'),
	(79, 79, 1, 1.33, 'QR', NULL, 0.00, NULL, '2026-03-20 20:32:01'),
	(80, 80, 1, 2.71, 'QR', NULL, 0.00, NULL, '2026-03-20 12:58:01'),
	(81, 81, 1, 3.38, 'efectivo', NULL, 0.00, NULL, '2026-03-20 20:52:01'),
	(82, 82, 1, 3.75, 'tarjeta', NULL, 0.00, NULL, '2026-03-20 17:56:01'),
	(83, 83, 1, 2.45, 'efectivo', NULL, 0.00, NULL, '2026-03-20 17:58:01'),
	(84, 84, 1, 2.48, 'efectivo', NULL, 0.00, NULL, '2026-03-20 16:08:01'),
	(85, 85, 1, 1.86, 'efectivo', NULL, 0.00, NULL, '2026-03-20 19:55:01'),
	(86, 86, 1, 1.95, 'efectivo', NULL, 0.00, NULL, '2026-03-20 12:33:01'),
	(87, 87, 1, 2.17, 'tarjeta', NULL, 0.00, NULL, '2026-03-20 13:09:01'),
	(88, 88, 1, 1.99, 'QR', NULL, 0.00, NULL, '2026-03-20 11:50:01'),
	(89, 89, 1, 2.52, 'QR', NULL, 0.00, NULL, '2026-03-20 15:56:01'),
	(90, 90, 1, 2.68, 'efectivo', NULL, 0.00, NULL, '2026-03-21 18:12:01'),
	(91, 91, 1, 1.13, 'efectivo', NULL, 0.00, NULL, '2026-03-21 14:25:01'),
	(92, 92, 1, 3.21, 'efectivo', NULL, 0.00, NULL, '2026-03-21 14:43:01'),
	(93, 93, 1, 2.93, 'QR', NULL, 0.00, NULL, '2026-03-21 17:40:01');

-- Volcando estructura para tabla parqueo_db.tarifas
CREATE TABLE IF NOT EXISTS `tarifas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_vehiculo` enum('auto','moto','discapacitado','VIP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `modalidad` enum('hora','fraccion','dia','mensual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hora',
  `precio` decimal(10,2) NOT NULL,
  `tiempo_gracia` int DEFAULT '10',
  `descripcion` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.tarifas: ~10 rows (aproximadamente)
DELETE FROM `tarifas`;
INSERT INTO `tarifas` (`id`, `tipo_vehiculo`, `modalidad`, `precio`, `tiempo_gracia`, `descripcion`, `activo`, `created_at`) VALUES
	(1, 'auto', 'hora', 1.00, 10, 'Auto - tarifa por hora', 1, '2026-03-21 06:57:37'),
	(2, 'auto', 'dia', 8.00, 10, 'Auto - tarifa d├¡a completo', 1, '2026-03-21 06:57:37'),
	(3, 'auto', 'mensual', 60.00, 0, 'Auto - abono mensual', 1, '2026-03-21 06:57:37'),
	(4, 'moto', 'hora', 0.50, 10, 'Moto - tarifa por hora', 1, '2026-03-21 06:57:37'),
	(40, 'moto', 'fraccion', 4.71, 10, 'Tarifa extra', 1, '2026-03-21 07:19:27'),
	(41, 'VIP', 'mensual', 9.52, 10, 'Tarifa extra', 1, '2026-03-21 07:19:27'),
	(42, 'discapacitado', 'dia', 9.35, 10, 'Tarifa extra', 1, '2026-03-21 07:19:27'),
	(43, 'auto', 'fraccion', 3.63, 10, 'Tarifa extra', 1, '2026-03-21 07:19:27'),
	(44, 'moto', 'mensual', 9.92, 10, 'Tarifa extra', 1, '2026-03-21 07:19:27'),
	(45, 'VIP', 'dia', 5.10, 10, 'Tarifa extra', 1, '2026-03-21 07:19:27');

-- Volcando estructura para tabla parqueo_db.tickets
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `placa` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_vehiculo` enum('auto','moto','discapacitado','VIP') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `espacio_id` int DEFAULT NULL,
  `usuario_entrada_id` int DEFAULT NULL,
  `usuario_salida_id` int DEFAULT NULL,
  `hora_entrada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `hora_salida` datetime DEFAULT NULL,
  `tiempo_minutos` int DEFAULT NULL,
  `tarifa_aplicada` decimal(10,2) DEFAULT NULL,
  `monto_cobrar` decimal(10,2) DEFAULT NULL,
  `descuento` decimal(10,2) DEFAULT '0.00',
  `estado` enum('activo','cerrado','anulado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `espacio_id` (`espacio_id`),
  KEY `usuario_entrada_id` (`usuario_entrada_id`),
  KEY `usuario_salida_id` (`usuario_salida_id`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`espacio_id`) REFERENCES `espacios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`usuario_entrada_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`usuario_salida_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.tickets: ~99 rows (aproximadamente)
DELETE FROM `tickets`;
INSERT INTO `tickets` (`id`, `codigo`, `placa`, `tipo_vehiculo`, `espacio_id`, `usuario_entrada_id`, `usuario_salida_id`, `hora_entrada`, `hora_salida`, `tiempo_minutos`, `tarifa_aplicada`, `monto_cobrar`, `descuento`, `estado`, `observaciones`, `created_at`) VALUES
	(1, 'T-00001', 'BCD-071', 'moto', 21, NULL, NULL, '2026-03-14 09:36:00', '2026-03-14 10:36:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(2, 'T-00002', 'CDE-072', 'auto', 1, NULL, NULL, '2026-03-14 12:25:00', '2026-03-14 15:25:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(3, 'T-00003', 'DEF-073', 'auto', 1, NULL, NULL, '2026-03-14 11:15:00', '2026-03-14 13:15:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(4, 'T-00004', 'EFG-074', 'VIP', 46, NULL, NULL, '2026-03-14 12:20:00', '2026-03-14 14:20:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(5, 'T-00005', 'FGH-075', 'auto', 1, NULL, NULL, '2026-03-14 17:08:00', '2026-03-14 18:08:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(6, 'T-00006', 'GHI-076', 'moto', 21, NULL, NULL, '2026-03-14 17:55:00', '2026-03-14 19:55:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(7, 'T-00007', 'HIJ-077', 'auto', 1, NULL, NULL, '2026-03-14 15:43:00', '2026-03-14 16:43:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(8, 'T-00008', 'IJK-078', 'VIP', 46, NULL, NULL, '2026-03-14 14:24:00', '2026-03-14 15:24:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(9, 'T-00009', 'JKL-079', 'auto', 1, NULL, NULL, '2026-03-14 09:04:00', '2026-03-14 11:04:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(10, 'T-00010', 'KLM-0710', 'auto', 1, NULL, NULL, '2026-03-14 16:40:00', '2026-03-14 19:40:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(11, 'T-00011', 'LMN-0711', 'VIP', 46, NULL, NULL, '2026-03-14 16:03:00', '2026-03-14 19:03:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(12, 'T-00012', 'MNO-0712', 'moto', 21, NULL, NULL, '2026-03-14 13:03:00', '2026-03-14 14:03:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(13, 'T-00013', 'NOP-0713', 'discapacitado', 51, NULL, NULL, '2026-03-14 11:40:00', '2026-03-14 14:40:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(14, 'T-00014', 'OPQ-0714', 'auto', 1, NULL, NULL, '2026-03-14 08:10:00', '2026-03-14 09:10:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(15, 'T-00015', 'PQR-0715', 'moto', 21, NULL, NULL, '2026-03-14 17:05:00', '2026-03-14 20:05:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(16, 'T-00016', 'QRS-0716', 'moto', 21, NULL, NULL, '2026-03-14 08:23:00', '2026-03-14 09:23:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(17, 'T-00017', 'RST-0717', 'moto', 21, NULL, NULL, '2026-03-14 17:49:00', '2026-03-14 18:49:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(18, 'T-00018', 'BCD-061', 'auto', 1, NULL, NULL, '2026-03-15 13:32:00', '2026-03-15 16:32:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(19, 'T-00019', 'CDE-062', 'moto', 21, NULL, NULL, '2026-03-15 16:11:00', '2026-03-15 17:11:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(20, 'T-00020', 'DEF-063', 'discapacitado', 51, NULL, NULL, '2026-03-15 10:33:00', '2026-03-15 12:33:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(21, 'T-00021', 'EFG-064', 'auto', 1, NULL, NULL, '2026-03-15 13:53:00', '2026-03-15 14:53:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(22, 'T-00022', 'FGH-065', 'moto', 21, NULL, NULL, '2026-03-15 10:50:00', '2026-03-15 12:50:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(23, 'T-00023', 'GHI-066', 'VIP', 46, NULL, NULL, '2026-03-15 14:08:00', '2026-03-15 16:08:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(24, 'T-00024', 'HIJ-067', 'VIP', 46, NULL, NULL, '2026-03-15 16:13:00', '2026-03-15 19:13:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(25, 'T-00025', 'IJK-068', 'VIP', 46, NULL, NULL, '2026-03-15 15:57:00', '2026-03-15 17:57:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(26, 'T-00026', 'JKL-069', 'moto', 21, NULL, NULL, '2026-03-15 11:58:00', '2026-03-15 12:58:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(27, 'T-00027', 'KLM-0610', 'auto', 1, NULL, NULL, '2026-03-15 13:13:00', '2026-03-15 16:13:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(28, 'T-00028', 'LMN-0611', 'auto', 1, NULL, NULL, '2026-03-15 09:30:00', '2026-03-15 10:30:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(29, 'T-00029', 'MNO-0612', 'auto', 1, NULL, NULL, '2026-03-15 11:17:00', '2026-03-15 12:17:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(30, 'T-00030', 'NOP-0613', 'auto', 1, NULL, NULL, '2026-03-15 10:03:00', '2026-03-15 12:03:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(31, 'T-00031', 'OPQ-0614', 'VIP', 46, NULL, NULL, '2026-03-15 11:30:00', '2026-03-15 12:30:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(32, 'T-00032', 'PQR-0615', 'auto', 1, NULL, NULL, '2026-03-15 11:42:00', '2026-03-15 14:42:00', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(33, 'T-00033', 'BCD-051', 'moto', 21, NULL, NULL, '2026-03-16 08:55:01', '2026-03-16 10:55:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(34, 'T-00034', 'CDE-052', 'discapacitado', 51, NULL, NULL, '2026-03-16 17:03:01', '2026-03-16 18:03:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(35, 'T-00035', 'DEF-053', 'moto', 21, NULL, NULL, '2026-03-16 11:42:01', '2026-03-16 13:42:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(36, 'T-00036', 'EFG-054', 'discapacitado', 51, NULL, NULL, '2026-03-16 15:46:01', '2026-03-16 17:46:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(37, 'T-00037', 'FGH-055', 'moto', 21, NULL, NULL, '2026-03-16 17:20:01', '2026-03-16 20:20:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(38, 'T-00038', 'BCD-041', 'discapacitado', 51, NULL, NULL, '2026-03-17 09:20:01', '2026-03-17 10:20:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(39, 'T-00039', 'CDE-042', 'moto', 21, NULL, NULL, '2026-03-17 12:44:01', '2026-03-17 14:44:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(40, 'T-00040', 'DEF-043', 'auto', 1, NULL, NULL, '2026-03-17 08:15:01', '2026-03-17 09:15:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(41, 'T-00041', 'EFG-044', 'auto', 1, NULL, NULL, '2026-03-17 16:58:01', '2026-03-17 19:58:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(42, 'T-00042', 'FGH-045', 'discapacitado', 51, NULL, NULL, '2026-03-17 11:44:01', '2026-03-17 13:44:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(43, 'T-00043', 'GHI-046', 'moto', 21, NULL, NULL, '2026-03-17 09:09:01', '2026-03-17 12:09:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(44, 'T-00044', 'HIJ-047', 'VIP', 46, NULL, NULL, '2026-03-17 17:07:01', '2026-03-17 20:07:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(45, 'T-00045', 'IJK-048', 'moto', 21, NULL, NULL, '2026-03-17 15:05:01', '2026-03-17 16:05:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(46, 'T-00046', 'JKL-049', 'auto', 1, NULL, NULL, '2026-03-17 13:45:01', '2026-03-17 14:45:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(47, 'T-00047', 'KLM-0410', 'moto', 21, NULL, NULL, '2026-03-17 16:12:01', '2026-03-17 18:12:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(48, 'T-00048', 'LMN-0411', 'discapacitado', 51, NULL, NULL, '2026-03-17 09:33:01', '2026-03-17 12:33:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(49, 'T-00049', 'MNO-0412', 'auto', 1, NULL, NULL, '2026-03-17 09:48:01', '2026-03-17 11:48:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(50, 'T-00050', 'NOP-0413', 'auto', 1, NULL, NULL, '2026-03-17 13:06:01', '2026-03-17 16:06:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(51, 'T-00051', 'OPQ-0414', 'moto', 21, NULL, NULL, '2026-03-17 15:02:01', '2026-03-17 17:02:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(52, 'T-00052', 'PQR-0415', 'VIP', 46, NULL, NULL, '2026-03-17 15:36:01', '2026-03-17 16:36:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(53, 'T-00053', 'QRS-0416', 'discapacitado', 51, NULL, NULL, '2026-03-17 08:51:01', '2026-03-17 09:51:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(54, 'T-00054', 'BCD-031', 'moto', 21, NULL, NULL, '2026-03-18 16:36:01', '2026-03-18 17:36:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(55, 'T-00055', 'CDE-032', 'auto', 1, NULL, NULL, '2026-03-18 11:44:01', '2026-03-18 13:44:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(56, 'T-00056', 'DEF-033', 'VIP', 46, NULL, NULL, '2026-03-18 15:30:01', '2026-03-18 16:30:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(57, 'T-00057', 'EFG-034', 'VIP', 46, NULL, NULL, '2026-03-18 09:26:01', '2026-03-18 12:26:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(58, 'T-00058', 'FGH-035', 'discapacitado', 51, NULL, NULL, '2026-03-18 08:52:01', '2026-03-18 10:52:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(59, 'T-00059', 'GHI-036', 'VIP', 46, NULL, NULL, '2026-03-18 10:57:01', '2026-03-18 13:57:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(60, 'T-00060', 'HIJ-037', 'moto', 21, NULL, NULL, '2026-03-18 13:15:01', '2026-03-18 14:15:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(61, 'T-00061', 'BCD-021', 'VIP', 46, NULL, NULL, '2026-03-19 14:03:01', '2026-03-19 17:03:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(62, 'T-00062', 'CDE-022', 'moto', 21, NULL, NULL, '2026-03-19 14:57:01', '2026-03-19 16:57:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(63, 'T-00063', 'DEF-023', 'discapacitado', 51, NULL, NULL, '2026-03-19 14:43:01', '2026-03-19 17:43:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(64, 'T-00064', 'EFG-024', 'VIP', 46, NULL, NULL, '2026-03-19 11:08:01', '2026-03-19 14:08:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(65, 'T-00065', 'FGH-025', 'auto', 1, NULL, NULL, '2026-03-19 16:38:01', '2026-03-19 18:38:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(66, 'T-00066', 'GHI-026', 'VIP', 46, NULL, NULL, '2026-03-19 11:45:01', '2026-03-19 14:45:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(67, 'T-00067', 'HIJ-027', 'auto', 1, NULL, NULL, '2026-03-19 17:16:01', '2026-03-19 18:16:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(68, 'T-00068', 'IJK-028', 'VIP', 46, NULL, NULL, '2026-03-19 12:01:01', '2026-03-19 14:01:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(69, 'T-00069', 'JKL-029', 'auto', 1, NULL, NULL, '2026-03-19 08:51:01', '2026-03-19 09:51:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(70, 'T-00070', 'KLM-0210', 'VIP', 46, NULL, NULL, '2026-03-19 12:18:01', '2026-03-19 14:18:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(71, 'T-00071', 'LMN-0211', 'discapacitado', 51, NULL, NULL, '2026-03-19 15:36:01', '2026-03-19 18:36:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(72, 'T-00072', 'MNO-0212', 'moto', 21, NULL, NULL, '2026-03-19 17:40:01', '2026-03-19 18:40:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(73, 'T-00073', 'NOP-0213', 'moto', 21, NULL, NULL, '2026-03-19 11:15:01', '2026-03-19 13:15:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(74, 'T-00074', 'OPQ-0214', 'discapacitado', 51, NULL, NULL, '2026-03-19 17:13:01', '2026-03-19 19:13:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(75, 'T-00075', 'PQR-0215', 'discapacitado', 51, NULL, NULL, '2026-03-19 11:12:01', '2026-03-19 14:12:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(76, 'T-00076', 'QRS-0216', 'auto', 1, NULL, NULL, '2026-03-19 16:31:01', '2026-03-19 18:31:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(77, 'T-00077', 'RST-0217', 'discapacitado', 51, NULL, NULL, '2026-03-19 17:26:01', '2026-03-19 19:26:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(78, 'T-00078', 'STU-0218', 'moto', 21, NULL, NULL, '2026-03-19 14:36:01', '2026-03-19 17:36:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(79, 'T-00079', 'BCD-011', 'moto', 21, NULL, NULL, '2026-03-20 17:32:01', '2026-03-20 20:32:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(80, 'T-00080', 'CDE-012', 'auto', 1, NULL, NULL, '2026-03-20 11:58:01', '2026-03-20 12:58:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(81, 'T-00081', 'DEF-013', 'auto', 1, NULL, NULL, '2026-03-20 17:52:01', '2026-03-20 20:52:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(82, 'T-00082', 'EFG-014', 'auto', 1, NULL, NULL, '2026-03-20 15:56:01', '2026-03-20 17:56:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(83, 'T-00083', 'FGH-015', 'auto', 1, NULL, NULL, '2026-03-20 14:58:01', '2026-03-20 17:58:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(84, 'T-00084', 'GHI-016', 'VIP', 46, NULL, NULL, '2026-03-20 13:08:01', '2026-03-20 16:08:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(85, 'T-00085', 'HIJ-017', 'moto', 21, NULL, NULL, '2026-03-20 16:55:01', '2026-03-20 19:55:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(86, 'T-00086', 'IJK-018', 'auto', 1, NULL, NULL, '2026-03-20 10:33:01', '2026-03-20 12:33:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(87, 'T-00087', 'JKL-019', 'auto', 1, NULL, NULL, '2026-03-20 10:09:01', '2026-03-20 13:09:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(88, 'T-00088', 'KLM-0110', 'VIP', 46, NULL, NULL, '2026-03-20 10:50:01', '2026-03-20 11:50:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(89, 'T-00089', 'LMN-0111', 'moto', 21, NULL, NULL, '2026-03-20 13:56:01', '2026-03-20 15:56:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(90, 'T-00090', 'BCD-001', 'auto', 1, NULL, NULL, '2026-03-21 17:12:01', '2026-03-21 18:12:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(91, 'T-00091', 'CDE-002', 'VIP', 46, NULL, NULL, '2026-03-21 13:25:01', '2026-03-21 14:25:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(92, 'T-00092', 'DEF-003', 'moto', 21, NULL, NULL, '2026-03-21 11:43:01', '2026-03-21 14:43:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(93, 'T-00093', 'EFG-004', 'auto', 1, NULL, NULL, '2026-03-21 16:40:01', '2026-03-21 17:40:01', NULL, NULL, NULL, 0.00, 'cerrado', NULL, '2026-03-21 07:19:27'),
	(94, 'T-00094', 'FGH-005', 'discapacitado', 51, NULL, NULL, '2026-03-21 17:09:01', NULL, NULL, NULL, NULL, 0.00, 'activo', NULL, '2026-03-21 07:19:27'),
	(95, 'T-00095', 'GHI-006', 'auto', 1, NULL, NULL, '2026-03-21 14:20:01', NULL, NULL, NULL, NULL, 0.00, 'activo', NULL, '2026-03-21 07:19:27'),
	(96, 'T-00096', 'HIJ-007', 'discapacitado', 52, NULL, NULL, '2026-03-21 17:25:01', NULL, NULL, NULL, NULL, 0.00, 'activo', NULL, '2026-03-21 07:19:27'),
	(97, 'T-00097', 'IJK-008', 'moto', 21, NULL, NULL, '2026-03-21 12:01:01', NULL, NULL, NULL, NULL, 0.00, 'activo', NULL, '2026-03-21 07:19:27'),
	(98, 'T-00098', 'JKL-009', 'discapacitado', 53, NULL, NULL, '2026-03-21 10:15:01', NULL, NULL, NULL, NULL, 0.00, 'activo', NULL, '2026-03-21 07:19:27'),
	(99, 'T-00099', 'KLM-0010', 'auto', 2, NULL, NULL, '2026-03-21 09:42:01', NULL, NULL, NULL, NULL, 0.00, 'activo', NULL, '2026-03-21 07:19:27');

-- Volcando estructura para tabla parqueo_db.usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rol` enum('admin','operador','cajero') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'operador',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.usuarios: ~11 rows (aproximadamente)
DELETE FROM `usuarios`;
INSERT INTO `usuarios` (`id`, `nombre`, `username`, `password`, `email`, `rol`, `activo`, `created_at`, `updated_at`) VALUES
	(1, 'Administrador', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@parksmart.com', 'admin', 1, '2026-03-21 06:57:37', '2026-03-21 06:57:37'),
	(54, 'Usuario Prueba 1', 'usuario1', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user1@test.com', 'admin', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(55, 'Usuario Prueba 2', 'usuario2', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user2@test.com', 'admin', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(56, 'Usuario Prueba 3', 'usuario3', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user3@test.com', 'operador', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(57, 'Usuario Prueba 4', 'usuario4', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user4@test.com', 'operador', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(58, 'Usuario Prueba 5', 'usuario5', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user5@test.com', 'operador', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(59, 'Usuario Prueba 6', 'usuario6', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user6@test.com', 'operador', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(60, 'Usuario Prueba 7', 'usuario7', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user7@test.com', 'cajero', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(61, 'Usuario Prueba 8', 'usuario8', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user8@test.com', 'cajero', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(62, 'Usuario Prueba 9', 'usuario9', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user9@test.com', 'cajero', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27'),
	(63, 'Usuario Prueba 10', 'usuario10', '$2a$08$lSxnJSXCaAZZEqCdlxD/COBs4IpqVA1X1H5SJ4WYFiIEhB7bfrYj2', 'user10@test.com', 'cajero', 1, '2026-03-21 07:19:27', '2026-03-21 07:19:27');

-- Volcando estructura para tabla parqueo_db.vehiculos
CREATE TABLE IF NOT EXISTS `vehiculos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `placa` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('auto','moto','discapacitado','VIP') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marca` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cliente_id` (`cliente_id`),
  CONSTRAINT `vehiculos_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.vehiculos: ~0 rows (aproximadamente)
DELETE FROM `vehiculos`;

-- Volcando estructura para tabla parqueo_db.zonas
CREATE TABLE IF NOT EXISTS `zonas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `piso` int DEFAULT '1',
  `descripcion` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parqueo_db.zonas: ~4 rows (aproximadamente)
DELETE FROM `zonas`;
INSERT INTO `zonas` (`id`, `nombre`, `piso`, `descripcion`, `activo`) VALUES
	(1, 'Zona A', 1, 'Planta baja - Autos', 1),
	(2, 'Zona B', 1, 'Planta baja - Motos', 1),
	(3, 'Zona C', 2, 'Segundo piso - Autos', 1),
	(4, 'Zona VIP', 1, 'Zona VIP y discapacitados', 1);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
