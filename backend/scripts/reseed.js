const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { sequelize, Rol, Usuario, TipoVehiculo, TipoMantenimiento } = require('../src/models');

// ============================================================
// VALIDACIÓN DE VARIABLES DE ENTORNO REQUERIDAS
// ============================================================

const REQUIRED_ENV_VARS = [
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
  'SEED_EMPLEADO_EMAIL',
  'SEED_EMPLEADO_PASSWORD'
];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ ERROR: Faltan variables de entorno requeridas:');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error('\n   Crea un archivo .env en backend/ con:');
  console.error('   SEED_ADMIN_EMAIL=admin@controlvehicular.com');
  console.error('   SEED_ADMIN_PASSWORD=tu_password_seguro');
  console.error('   SEED_EMPLEADO_EMAIL=empleado@controlvehicular.com');
  console.error('   SEED_EMPLEADO_PASSWORD=tu_password_seguro');
  console.error('   BCRYPT_SALT_ROUNDS=10');
  process.exit(1);
}

const {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
  SEED_EMPLEADO_EMAIL,
  SEED_EMPLEADO_PASSWORD,
  BCRYPT_SALT_ROUNDS = '10',
  NODE_ENV
} = process.env;

const saltRounds = parseInt(BCRYPT_SALT_ROUNDS, 10);

// ============================================================
// PROTECCIÓN: NO EJECUTAR EN PRODUCCIÓN
// ============================================================

if (NODE_ENV === 'production') {
  console.error('\n❌ ERROR: No puedes ejecutar el reseed en entorno de producción.');
  console.error('   Esto destruiría todos los datos existentes.');
  process.exit(1);
}

// ============================================================
// CONFIRMACIÓN INTERACTIVA
// ============================================================

async function askConfirmation() {
  // Si no hay TTY (Docker, CI, pipe), requerir flag explícito
  if (!process.stdin.isTTY) {
    const forceFlag = process.argv.includes('--force');
    if (!forceFlag) {
      console.error('\n❌ No se detecta una terminal interactiva.');
      console.error('   Para ejecutar en modo no interactivo, usa el flag --force');
      process.exit(1);
    }
    return true;
  }

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  ADVERTENCIA: Este script BORRARÁ Y VOLVERÁ A CREAR los datos semilla.\n' +
      '   ¿Estás seguro de que deseas continuar? (escribe "RESEED" para confirmar): ',
      (answer) => {
        rl.close();
        resolve(answer.trim() === 'RESEED');
      }
    );
  });
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================

async function reseed() {
  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('\n❌ Reseed cancelado por el usuario.');
    return;
  }

  try {
    await sequelize.sync({ force: false });
    console.log('\n✓ Base de datos sincronizada');

    // --- Roles ---
    await Rol.bulkCreate([
      {
        nombre: 'Administrador',
        descripcion: 'Control total del sistema',
        permisos: {
          all: true,
          vehiculos: 'crud',
          solicitudes: 'full',
          mantenimientos: 'crud',
          usuarios: 'crud',
          config: 'full'
        }
      },
      {
        nombre: 'Empleado',
        descripcion: 'Acceso a operaciones diarias',
        permisos: {
          vehiculos: 'read_create',
          solicitudes: 'create_read_own',
          mantenimientos: 'read_create',
          reportes: 'read'
        }
      }
    ], { ignoreDuplicates: true });
    console.log('✓ Roles creados');

    // --- Usuarios ---
    const adminRol = await Rol.findOne({ where: { nombre: 'Administrador' } });
    const empleadoRol = await Rol.findOne({ where: { nombre: 'Empleado' } });

    const adminPasswordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, saltRounds);
    const empleadoPasswordHash = await bcrypt.hash(SEED_EMPLEADO_PASSWORD, saltRounds);

    await Usuario.bulkCreate([
      {
        nombre: 'Admin',
        apellido: 'Sistema',
        email: SEED_ADMIN_EMAIL,
        password: adminPasswordHash,
        telefono: '555-0100',
        rol_id: adminRol.id
      },
      {
        nombre: 'Empleado',
        apellido: 'Prueba',
        email: SEED_EMPLEADO_EMAIL,
        password: empleadoPasswordHash,
        telefono: '555-0101',
        rol_id: empleadoRol.id
      }
    ], { ignoreDuplicates: true, individualHooks: true });
    console.log('✓ Usuarios creados');

    // --- Tipos de vehículo ---
    await TipoVehiculo.bulkCreate([
      { nombre: 'Camioneta', descripcion: 'Vehiculo tipo pickup o SUV grande', icono: 'truck' },
      { nombre: 'Sedan', descripcion: 'Automovil de 4 puertas', icono: 'car' },
      { nombre: 'SUV', descripcion: 'Sport Utility Vehicle', icono: 'car' },
      { nombre: 'Camion', descripcion: 'Vehiculo de carga pesada', icono: 'truck' },
      { nombre: 'Van', descripcion: 'Vehiculo de transporte de pasajeros', icono: 'van' },
      { nombre: 'Motocicleta', descripcion: 'Motocicleta para entregas rapidas', icono: 'bike' }
    ], { ignoreDuplicates: true });
    console.log('✓ Tipos de vehiculo creados');

    // --- Tipos de mantenimiento ---
    await TipoMantenimiento.bulkCreate([
      { nombre: 'Cambio de Aceite', descripcion: 'Cambio de aceite del motor y filtro', icono: 'droplet', cada_km: 5000, cada_dias: 180 },
      { nombre: 'Frenos', descripcion: 'Revision y cambio de pastillas/discos de freno', icono: 'circle-slash', cada_km: 10000, cada_dias: 365 },
      { nombre: 'Llantas', descripcion: 'Rotacion, balanceo o cambio de llantas', icono: 'circle', cada_km: 15000, cada_dias: 365 },
      { nombre: 'Bateria', descripcion: 'Revision y cambio de bateria', icono: 'battery-charging', cada_dias: 730 },
      { nombre: 'Sistema Electrico', descripcion: 'Revision de sistema electrico general', icono: 'zap', cada_dias: 365 },
      { nombre: 'Motor', descripcion: 'Mantenimiento del motor', icono: 'settings', cada_km: 20000, cada_dias: 730 },
      { nombre: 'Suspension', descripcion: 'Revision de amortiguadores y suspension', icono: 'chevrons-up', cada_km: 20000, cada_dias: 365 },
      { nombre: 'Transmision', descripcion: 'Cambio de aceite de transmision', icono: 'shuffle', cada_km: 40000, cada_dias: 730 },
      { nombre: 'Refrigeracion', descripcion: 'Revision del sistema de refrigeracion', icono: 'thermometer', cada_km: 30000, cada_dias: 365 },
      { nombre: 'Otro', descripcion: 'Otros tipos de mantenimiento', icono: 'wrench' }
    ], { ignoreDuplicates: true });
    console.log('✓ Tipos de mantenimiento creados');

    console.log('\n========================================');
    console.log('  ✅ SEED COMPLETADO EXITOSAMENTE');
    console.log('========================================');
    console.log('  Usuario administrador creado/actualizado');
    console.log('  Usuario empleado creado/actualizado');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ Error en seed:', error);
    throw error;
  } finally {
    await sequelize.close().catch(() => {});
    console.log('🔌 Conexión a la base de datos cerrada.');
  }
}

reseed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
