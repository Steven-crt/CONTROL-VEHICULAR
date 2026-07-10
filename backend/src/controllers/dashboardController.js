const { Op } = require('sequelize');
const { Vehiculo, SolicitudCombustible, Mantenimiento, Usuario } = require('../models');
const sequelize = require('../config/database');

exports.kpis = async (req, res) => {
  try {
    const [
      totalVehiculos,
      vehiculosActivos,
      solicitudesPendientes,
      mantenimientosProximos,
      gastoCombustible,
      totalGalones
    ] = await Promise.all([
      Vehiculo.count({ where: { activo: 1 } }),
      Vehiculo.count({ where: { activo: 1, estado: 'Activo' } }),
      SolicitudCombustible.count({ where: { estado: 'Pendiente' } }),
      Mantenimiento.count({ where: { estado: { [Op.in]: ['Programado', 'En Proceso'] } } }),
      SolicitudCombustible.findOne({
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('costo_total')), 0), 'total']
        ],
        where: { estado: 'Surtida' }
      }),
      SolicitudCombustible.findOne({
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('galones_surtidos')), 0), 'total']
        ],
        where: { estado: 'Surtida' }
      })
    ]);

    res.json({
      total_vehiculos: totalVehiculos,
      vehiculos_activos: vehiculosActivos,
      solicitudes_pendientes: solicitudesPendientes,
      mantenimientos_proximos: mantenimientosProximos,
      gasto_combustible: parseFloat(gastoCombustible.dataValues.total) || 0,
      total_galones: parseFloat(totalGalones.dataValues.total) || 0
    });
  } catch (error) {
    console.error('Error en kpis:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.combustibleMensual = async (req, res) => {
  try {
    const { fn, col, literal } = sequelize;
    const data = await SolicitudCombustible.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('fecha_solicitud'), '%Y-%m'), 'mes'],
        [fn('COALESCE', fn('SUM', col('galones_surtidos')), 0), 'galones'],
        [fn('COALESCE', fn('SUM', col('costo_total')), 0), 'costo']
      ],
      where: { estado: 'Surtida' },
      group: [fn('DATE_FORMAT', col('fecha_solicitud'), '%Y-%m')],
      order: [[fn('DATE_FORMAT', col('fecha_solicitud'), '%Y-%m'), 'ASC']],
      limit: 12
    });

    res.json(data);
  } catch (error) {
    console.error('Error en combustibleMensual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actividadReciente = async (req, res) => {
  try {
    const solicitudes = await SolicitudCombustible.findAll({
      include: [
        { association: 'vehiculo', attributes: ['placa', 'marca', 'modelo'] },
        { association: 'solicitante', attributes: ['nombre', 'apellido'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    const mantenimientos = await Mantenimiento.findAll({
      include: [
        { association: 'vehiculo', attributes: ['placa', 'marca', 'modelo'] },
        { association: 'tipo_mantenimiento', attributes: ['nombre'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    const actividad = [
      ...solicitudes.map(s => ({
        tipo: 'solicitud_combustible',
        descripcion: `Solicitud #${s.codigo} - ${s.vehiculo.placa} (${s.estado})`,
        fecha: s.created_at,
        estado: s.estado
      })),
      ...mantenimientos.map(m => ({
        tipo: 'mantenimiento',
        descripcion: `${m.tipo_mantenimiento.nombre} - ${m.vehiculo.placa} (${m.estado})`,
        fecha: m.created_at,
        estado: m.estado
      }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);

    res.json(actividad);
  } catch (error) {
    console.error('Error en actividadReciente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.vehiculosEstado = async (req, res) => {
  try {
    const data = await Vehiculo.findAll({
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      where: { activo: 1 },
      group: ['estado'],
      raw: true
    });
    res.json(data);
  } catch (error) {
    console.error('Error en vehiculosEstado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.gastoMantenimiento = async (req, res) => {
  try {
    const { fn, col } = sequelize;
    const data = await Mantenimiento.findAll({
      attributes: [
        'tipo_mantenimiento_id',
        [fn('COUNT', col('Mantenimiento.id')), 'cantidad'],
        [fn('COALESCE', fn('SUM', col('costo')), 0), 'total_costo']
      ],
      where: { estado: 'Completado' },
      include: [
        { association: 'tipo_mantenimiento', attributes: ['nombre'] }
      ],
      group: ['tipo_mantenimiento_id'],
      order: [[fn('COALESCE', fn('SUM', col('costo')), 0), 'DESC']],
      limit: 8
    });
    res.json(data);
  } catch (error) {
    console.error('Error en gastoMantenimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.proximosMantenimientos = async (req, res) => {
  try {
    const data = await Mantenimiento.findAll({
      include: [
        { association: 'vehiculo', attributes: ['placa', 'marca', 'modelo', 'kilometraje_actual'] },
        { association: 'tipo_mantenimiento', attributes: ['nombre', 'cada_km', 'cada_dias'] }
      ],
      where: {
        estado: { [Op.in]: ['Programado', 'En Proceso'] }
      },
      order: [['fecha_programada', 'ASC']],
      limit: 10
    });

    res.json(data);
  } catch (error) {
    console.error('Error en proximosMantenimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
