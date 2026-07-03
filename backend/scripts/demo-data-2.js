const bcrypt = require('bcryptjs');
const { Rol, Usuario, Asignacion, Mantenimiento, TipoMantenimiento, Vehiculo } = require('../src/models');

async function crearUsuariosExtra(rolEmpleado) {
  const hash = await bcrypt.hash('Empleado@123', 10);
  await Usuario.bulkCreate([
    {
      nombre: 'Carlos', apellido: 'Méndez', email: 'carlos.mendez@empresa.com',
      password: hash, telefono: '5555-1001', rol_id: rolEmpleado, activo: 1
    },
    {
      nombre: 'María', apellido: 'González', email: 'maria.gonzalez@empresa.com',
      password: hash, telefono: '5555-1002', rol_id: rolEmpleado, activo: 1
    },
    {
      nombre: 'Luis', apellido: 'Pérez', email: 'luis.perez@empresa.com',
      password: hash, telefono: '5555-1003', rol_id: rolEmpleado, activo: 1
    },
    {
      nombre: 'Ana', apellido: 'Ramírez', email: 'ana.ramirez@empresa.com',
      password: hash, telefono: '5555-1004', rol_id: rolEmpleado, activo: 1
    },
  ], { ignoreDuplicates: true, individualHooks: true });
  console.log('✓ Usuarios empleados adicionales creados');
}

async function crearAsignaciones() {
  const vehiculos = await Vehiculo.findAll({ limit: 6, order: [['id', 'ASC']] });
  const empleados = await Usuario.findAll({
    include: [{ association: 'rol', where: { nombre: 'Empleado' } }],
    order: [['id', 'ASC']]
  });

  if (vehiculos.length < 2 || empleados.length < 2) {
    console.log('⚠ No hay suficientes vehículos o empleados para asignaciones');
    return;
  }

  const pares = [
    [0, 0], [1, 0], [2, 1], [3, 1], [4, 2], [5, 2]
  ];

  for (const [vi, ei] of pares) {
    if (vehiculos[vi] && empleados[ei]) {
      await Asignacion.findOrCreate({
        where: { usuario_id: empleados[ei].id, vehiculo_id: vehiculos[vi].id }
      });
    }
  }
  console.log('✓ Asignaciones creadas');
}

async function crearMantenimientos(adminId) {
  const vehiculos = await Vehiculo.findAll({ order: [['id', 'ASC']] });
  const tipos = await TipoMantenimiento.findAll();
  const tipoMap = {};
  tipos.forEach(t => { tipoMap[t.nombre] = t.id; });

  if (!vehiculos.length) return;

  const datos = [
    {
      codigo: 'MT-00001', vehiculo_id: vehiculos[0]?.id,
      tipo_mantenimiento_id: tipoMap['Cambio de Aceite'],
      descripcion: 'Cambio de aceite 5W-30 y filtro de aceite',
      kilometraje_programado: 45000, fecha_programada: '2026-05-10',
      kilometraje_realizado: 45230, fecha_realizada: '2026-05-12',
      costo: 350.00, proveedor: 'Taller Mecánico El Rápido',
      estado: 'Completado', atendido_por_id: adminId
    },
    {
      codigo: 'MT-00002', vehiculo_id: vehiculos[1]?.id,
      tipo_mantenimiento_id: tipoMap['Frenos'],
      descripcion: 'Cambio de pastillas delanteras y traseras',
      kilometraje_programado: 60000, fecha_programada: '2026-05-20',
      kilometraje_realizado: 62100, fecha_realizada: '2026-05-22',
      costo: 850.00, proveedor: 'Taller Mecánico El Rápido',
      estado: 'Completado', atendido_por_id: adminId
    },
    {
      codigo: 'MT-00003', vehiculo_id: vehiculos[4]?.id,
      tipo_mantenimiento_id: tipoMap['Motor'],
      descripcion: 'Revisión general del motor, ajuste de válvulas',
      kilometraje_programado: 98000, fecha_programada: '2026-06-15',
      costo: 2200.00, proveedor: 'Taller Diesel Profesional',
      estado: 'En Proceso', atendido_por_id: adminId
    },
    {
      codigo: 'MT-00004', vehiculo_id: vehiculos[2]?.id,
      tipo_mantenimiento_id: tipoMap['Llantas'],
      descripcion: 'Rotación y balanceo de llantas',
      kilometraje_programado: 20000, fecha_programada: '2026-07-10',
      costo: 280.00, estado: 'Programado', atendido_por_id: adminId
    },
    {
      codigo: 'MT-00005', vehiculo_id: vehiculos[0]?.id,
      tipo_mantenimiento_id: tipoMap['Frenos'],
      descripcion: 'Revisión preventiva de frenos',
      kilometraje_programado: 50000, fecha_programada: '2026-07-15',
      estado: 'Programado', atendido_por_id: adminId
    },
    {
      codigo: 'MT-00006', vehiculo_id: vehiculos[3]?.id,
      tipo_mantenimiento_id: tipoMap['Cambio de Aceite'],
      descripcion: 'Cambio de aceite y filtro aire',
      kilometraje_programado: 30000, fecha_programada: '2026-04-05',
      kilometraje_realizado: 31800, fecha_realizada: '2026-04-06',
      costo: 380.00, proveedor: 'Taller Mecánico El Rápido',
      estado: 'Completado', atendido_por_id: adminId
    },
    {
      codigo: 'MT-00007', vehiculo_id: vehiculos[5]?.id,
      tipo_mantenimiento_id: tipoMap['Suspension'],
      descripcion: 'Cambio de amortiguadores delanteros',
      kilometraje_programado: 54000, fecha_programada: '2026-06-28',
      kilometraje_realizado: 54700, fecha_realizada: '2026-06-30',
      costo: 1200.00, proveedor: 'Taller Diesel Profesional',
      estado: 'Completado', atendido_por_id: adminId
    },
  ];

  for (const d of datos) {
    if (d.vehiculo_id) {
      await Mantenimiento.findOrCreate({ where: { codigo: d.codigo }, defaults: d });
    }
  }
  console.log('✓ Mantenimientos creados');
}

module.exports = { crearUsuariosExtra, crearAsignaciones, crearMantenimientos };
