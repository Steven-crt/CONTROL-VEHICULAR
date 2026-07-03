const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize, Rol, Usuario, TipoVehiculo, TipoMantenimiento } = require('../src/models');
const { crearVehiculos, crearProveedores } = require('./demo-data');
const { crearUsuariosExtra, crearAsignaciones, crearMantenimientos } = require('./demo-data-2');
const { crearSolicitudesCombustible } = require('./demo-data-3');

async function seed() {
  try {
    console.log('\n========================================');
    console.log('  CARGANDO DATOS DEMO');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✓ Conexión a BD exitosa\n');

    // 1. Roles
    await Rol.bulkCreate([
      {
        nombre: 'Administrador',
        descripcion: 'Control total del sistema',
        permisos: { all: true, vehiculos: 'crud', solicitudes: 'full', mantenimientos: 'crud', usuarios: 'crud', config: 'full' }
      },
      {
        nombre: 'Empleado',
        descripcion: 'Acceso a operaciones diarias',
        permisos: { vehiculos: 'read', solicitudes: 'create_read_own', mantenimientos: 'read', reportes: 'read' }
      }
    ], { ignoreDuplicates: true });
    console.log('✓ Roles verificados');

    // 2. Tipos de vehículo
    await TipoVehiculo.bulkCreate([
      { nombre: 'Camioneta', descripcion: 'Pickup o SUV grande', icono: 'truck' },
      { nombre: 'Sedan',     descripcion: 'Automóvil 4 puertas', icono: 'car' },
      { nombre: 'SUV',       descripcion: 'Sport Utility Vehicle', icono: 'car' },
      { nombre: 'Camion',    descripcion: 'Vehículo de carga pesada', icono: 'truck' },
      { nombre: 'Van',       descripcion: 'Transporte de pasajeros', icono: 'van' },
      { nombre: 'Motocicleta', descripcion: 'Entregas rápidas', icono: 'bike' }
    ], { ignoreDuplicates: true });
    console.log('✓ Tipos de vehículo verificados');

    // 3. Tipos de mantenimiento
    await TipoMantenimiento.bulkCreate([
      { nombre: 'Cambio de Aceite',  descripcion: 'Aceite del motor y filtro', icono: 'droplet',          cada_km: 5000,  cada_dias: 180 },
      { nombre: 'Frenos',            descripcion: 'Pastillas y discos de freno', icono: 'circle-slash',   cada_km: 10000, cada_dias: 365 },
      { nombre: 'Llantas',           descripcion: 'Rotación, balanceo o cambio', icono: 'circle',         cada_km: 15000, cada_dias: 365 },
      { nombre: 'Bateria',           descripcion: 'Revisión y cambio de batería', icono: 'battery-charging', cada_dias: 730 },
      { nombre: 'Sistema Electrico', descripcion: 'Sistema eléctrico general',   icono: 'zap',            cada_dias: 365 },
      { nombre: 'Motor',             descripcion: 'Mantenimiento del motor',      icono: 'settings',      cada_km: 20000, cada_dias: 730 },
      { nombre: 'Suspension',        descripcion: 'Amortiguadores y suspensión', icono: 'chevrons-up',    cada_km: 20000, cada_dias: 365 },
      { nombre: 'Transmision',       descripcion: 'Aceite de transmisión',        icono: 'shuffle',       cada_km: 40000, cada_dias: 730 },
      { nombre: 'Refrigeracion',     descripcion: 'Sistema de refrigeración',     icono: 'thermometer',   cada_km: 30000, cada_dias: 365 },
      { nombre: 'Otro',              descripcion: 'Otros mantenimientos',          icono: 'wrench' }
    ], { ignoreDuplicates: true });
    console.log('✓ Tipos de mantenimiento verificados');

    // Obtener IDs de roles y tipos
    const rolAdmin    = await Rol.findOne({ where: { nombre: 'Administrador' } });
    const rolEmpleado = await Rol.findOne({ where: { nombre: 'Empleado' } });
    const tiposList   = await TipoVehiculo.findAll();
    const tiposMap    = {};
    tiposList.forEach(t => { tiposMap[t.nombre] = t.id; });

    // 4. Usuarios extra
    await crearUsuariosExtra(rolEmpleado.id);

    // Obtener admin para usarlo como atendido_por
    const admin = await Usuario.findOne({
      include: [{ association: 'rol', where: { nombre: 'Administrador' } }]
    });

    // 5. Vehículos
    await crearVehiculos(tiposMap);

    // 6. Proveedores
    await crearProveedores();

    // 7. Asignaciones
    await crearAsignaciones();

    // 8. Mantenimientos
    await crearMantenimientos(admin.id);

    // 9. Solicitudes de combustible
    await crearSolicitudesCombustible(admin.id);

    console.log('\n========================================');
    console.log('  ✅ DATOS DEMO CARGADOS EXITOSAMENTE');
    console.log('========================================');
    console.log('  Credenciales de acceso:');
    console.log('  Admin:    admin@controlvehicular.com / Admin@123');
    console.log('  Empleado: empleado@controlvehicular.com / Empleado@123');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.parent) console.error('   DB:', err.parent.message);
  } finally {
    await sequelize.close();
  }
}

seed();
