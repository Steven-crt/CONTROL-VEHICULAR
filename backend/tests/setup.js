const crypto = require('crypto');

require('dotenv').config();

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
process.env.JWT_EXPIRES_IN = '30m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DB_NAME = 'control_vehicular_test';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.PORT = 3001;

// Test credentials — valores fijos centralizados para evitar hardcoded credentials dispersos
process.env.TEST_PASSWORD = 'Test@123';

// Auth tests
process.env.TEST_ADMIN_EMAIL = 'admin@test.com';
process.env.TEST_ADMIN_PASSWORD = 'Admin@123';
process.env.TEST_WRONG_PASSWORD = 'wrongpassword';
process.env.TEST_INVALID_EMAIL = 'noexiste@test.com';
process.env.TEST_INVALID_PASSWORD = 'password';
process.env.TEST_INVALID_REFRESH_TOKEN = 'invalid_token';

// Solicitudes tests
process.env.TEST_SOLICITUDES_ADMIN_EMAIL = 'admincomb@test.com';
process.env.TEST_SOLICITUDES_ADMIN_PASSWORD = 'Test@123';
process.env.TEST_SOLICITUDES_EMPLEADO_EMAIL = 'empcomb@test.com';
process.env.TEST_SOLICITUDES_EMPLEADO_PASSWORD = 'Test@123';

// Vehiculos tests
process.env.TEST_VEHICULOS_ADMIN_EMAIL = 'admin2@test.com';
process.env.TEST_VEHICULOS_ADMIN_PASSWORD = 'Test@123';
process.env.TEST_VEHICULOS_EMPLEADO_EMAIL = 'empleado@test.com';
process.env.TEST_VEHICULOS_EMPLEADO_PASSWORD = 'Test@123';
