/**
 * Genera un token JWT de prueba para el load test local.
 * Usa el JWT_SECRET del .env local (el backend local valida con el mismo).
 * NO imprime el secreto — solo el token, listo para exportar como TOKEN.
 *
 * Uso (PowerShell):
 *   $env:TOKEN = node scripts/gen-test-token.js
 *   npx artillery run loadtest.yml
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../src/utils/jwtSecret');

const secret = getJwtSecret();
const token = jwt.sign(
  { id: 1, username: 'loadtest', nombre: 'Load Test', rol: 'admin' },
  secret,
  { expiresIn: '1h' }
);
process.stdout.write(token);