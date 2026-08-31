/**
 * seed.js — Poblado de datos de PRUEBA para CONTROL-VEHICULAR.
 * ATENCIÓN: solo para desarrollo. Bloqueado en producción sin SEED_ALLOW_PROD=1.
 * No hardcodea password débil en repo: usa SEED_PASSWORD o genera aleatoria.
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'control_vehicular',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PROD !== '1') {
      console.error('❌ seed.js bloqueado en producción. Usa SEED_ALLOW_PROD=1 para forzar.');
      await connection.end();
      process.exit(1);
    }
    console.log('🌱 Iniciando poblado de datos de prueba (control-vehicular)...');

    // 1. Usuarios de prueba — no borrar admin real, solo usuarios de test
    console.log('→ Usuarios de prueba...');
    await connection.query("DELETE FROM usuarios WHERE username LIKE 'usuario_test_%'");
    const seedPwd = process.env.SEED_PASSWORD || `Test-${crypto.randomBytes(6).toString('hex')}!`;
    if (!process.env.SEED_PASSWORD) {
      console.log(`   (SEED_PASSWORD no definido, generada aleatoria: ${seedPwd} — guárdala si necesitas login)`);
    }
    const hash = await bcrypt.hash(seedPwd, 12);
    for (let i = 1; i <= 5; i++) {
      const rolVal = i <= 1 ? 'admin' : 'empleado';
      await connection.query(
        "INSERT INTO usuarios (nombre, username, email, password, rol_id, activo) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
        [`Usuario Test ${i}`, `usuario_test_${i}`, `test${i}@control.local`, hash, rolVal]
      );
    }

    // 2. Tipos de vehículo (idempotente)
    console.log('→ Tipos de vehículo...');
    await connection.query(
      "INSERT IGNORE INTO tipos_vehiculo (nombre) VALUES ('Camioneta'), ('Camion'), ('Minivan')"
    );

    // 3. Vehículos de demo (solo si hay pocos)
    console.log('→ Vehículos demo...');
    const [cntV] = await connection.query('SELECT COUNT(*) AS n FROM vehiculos WHERE activo=1');
    if (cntV[0].n < 3) {
      const [tipos] = await connection.query('SELECT id, nombre FROM tipos_vehiculo LIMIT 3');
      const tipoId = tipos[0]?.id || 1;
      const demoPlacas = ['ABC-1234', 'XYZ-5678', 'DEM-0001'];
      for (const placa of demoPlacas) {
        await connection.query(
          `INSERT IGNORE INTO vehiculos (placa, tipo_vehiculo_id, marca, modelo, color, ano, kilometraje_actual, activo, soat_numero, soat_empresa, soat_fecha_vencimiento)
           VALUES (?, ?, 'Toyota', 'Hilux', 'Blanco', 2024, 10000, 1, ?, 'Seguros Demo', DATE_ADD(CURDATE(), INTERVAL 90 DAY))`,
          [placa, tipoId, `SOAT-${placa}`]
        );
      }
    }

    // 4. Configuración base (no pisar valores existentes)
    console.log('→ Configuración base...');
    const SEED_CFG = [
      ['nombre_negocio', 'Control Vehicular'],
      ['moneda', '$'],
      ['intervalo_mant_km', '5000'],
    ];
    for (const [k, v] of SEED_CFG) {
      await connection.query('INSERT IGNORE INTO configuracion (clave, valor) VALUES (?, ?)', [k, v]);
    }

    console.log('✅ Seed completado. Usuarios de prueba: usuario_test_1..5');
    if (!process.env.SEED_PASSWORD) console.log('   Contraseña generada arriba — no se guarda en disco.');
  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}
seed();
