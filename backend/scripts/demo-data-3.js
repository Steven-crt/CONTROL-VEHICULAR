const { SolicitudCombustible, Vehiculo, Usuario } = require('../src/models');

async function crearSolicitudesCombustible(adminId) {
  const vehiculos = await Vehiculo.findAll({ order: [['id', 'ASC']] });
  const empleados = await Usuario.findAll({
    include: [{ association: 'rol', where: { nombre: 'Empleado' } }],
    order: [['id', 'ASC']]
  });

  if (!vehiculos.length || !empleados.length) return;

  const v = vehiculos;
  const e = empleados;

  const solicitudes = [
    // Surtidas (historial)
    {
      codigo: 'SC-00001', vehiculo_id: v[0]?.id, solicitante_id: e[0]?.id,
      galones_solicitados: 20, galones_surtidos: 20, costo_total: 380.00,
      precio_por_galon: 19.00, kilometraje_actual: 43500,
      estado: 'Surtida', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-05-01'), fecha_atencion: new Date('2026-05-01'),
      observaciones: 'Combustible para ruta semanal'
    },
    {
      codigo: 'SC-00002', vehiculo_id: v[1]?.id, solicitante_id: e[1]?.id,
      galones_solicitados: 30, galones_surtidos: 30, costo_total: 570.00,
      precio_por_galon: 19.00, kilometraje_actual: 60200,
      estado: 'Surtida', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-05-05'), fecha_atencion: new Date('2026-05-05')
    },
    {
      codigo: 'SC-00003', vehiculo_id: v[2]?.id, solicitante_id: e[2]?.id,
      galones_solicitados: 15, galones_surtidos: 15, costo_total: 292.50,
      precio_por_galon: 19.50, kilometraje_actual: 17800,
      estado: 'Surtida', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-05-10'), fecha_atencion: new Date('2026-05-10')
    },
    {
      codigo: 'SC-00004', vehiculo_id: v[0]?.id, solicitante_id: e[0]?.id,
      galones_solicitados: 25, galones_surtidos: 25, costo_total: 487.50,
      precio_por_galon: 19.50, kilometraje_actual: 44100,
      estado: 'Surtida', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-05-18'), fecha_atencion: new Date('2026-05-18')
    },
    {
      codigo: 'SC-00005', vehiculo_id: v[3]?.id, solicitante_id: e[3]?.id,
      galones_solicitados: 20, galones_surtidos: 20, costo_total: 400.00,
      precio_por_galon: 20.00, kilometraje_actual: 30500,
      estado: 'Surtida', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-06-02'), fecha_atencion: new Date('2026-06-02')
    },
    {
      codigo: 'SC-00006', vehiculo_id: v[5]?.id, solicitante_id: e[2]?.id,
      galones_solicitados: 35, galones_surtidos: 35, costo_total: 700.00,
      precio_por_galon: 20.00, kilometraje_actual: 53000,
      estado: 'Surtida', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-06-10'), fecha_atencion: new Date('2026-06-10')
    },
    {
      codigo: 'SC-00007', vehiculo_id: v[1]?.id, solicitante_id: e[1]?.id,
      galones_solicitados: 28, galones_surtidos: 28, costo_total: 560.00,
      precio_por_galon: 20.00, kilometraje_actual: 61500,
      estado: 'Surtida', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-06-15'), fecha_atencion: new Date('2026-06-15')
    },
    {
      codigo: 'SC-00008', vehiculo_id: v[2]?.id, solicitante_id: e[2]?.id,
      galones_solicitados: 18, galones_surtidos: 18, costo_total: 360.00,
      precio_por_galon: 20.00, kilometraje_actual: 18200,
      estado: 'Surtida', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-06-20'), fecha_atencion: new Date('2026-06-20')
    },
    // Aprobada (en espera de surtir)
    {
      codigo: 'SC-00009', vehiculo_id: v[0]?.id, solicitante_id: e[0]?.id,
      galones_solicitados: 22, estado: 'Aprobada', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-06-28'), fecha_atencion: new Date('2026-06-28'),
      observaciones: 'Urgente para viaje de mañana'
    },
    // Pendientes
    {
      codigo: 'SC-00010', vehiculo_id: v[3]?.id, solicitante_id: e[3]?.id,
      galones_solicitados: 25, estado: 'Pendiente',
      fecha_solicitud: new Date('2026-06-30'),
      observaciones: 'Viaje a zona norte'
    },
    {
      codigo: 'SC-00011', vehiculo_id: v[5]?.id, solicitante_id: e[2]?.id,
      galones_solicitados: 40, estado: 'Pendiente',
      fecha_solicitud: new Date('2026-07-01')
    },
    // Rechazada
    {
      codigo: 'SC-00012', vehiculo_id: v[6]?.id, solicitante_id: e[1]?.id,
      galones_solicitados: 50, estado: 'Rechazada', atendido_por_id: adminId,
      fecha_solicitud: new Date('2026-06-25'), fecha_atencion: new Date('2026-06-25'),
      observaciones: 'Cantidad excede capacidad del tanque'
    },
  ];

  for (const s of solicitudes) {
    if (s.vehiculo_id && s.solicitante_id) {
      await SolicitudCombustible.findOrCreate({ where: { codigo: s.codigo }, defaults: s });
    }
  }
  console.log('✓ Solicitudes de combustible creadas');
}

module.exports = { crearSolicitudesCombustible };
