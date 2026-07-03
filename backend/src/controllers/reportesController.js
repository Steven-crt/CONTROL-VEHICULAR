const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const { SolicitudCombustible, Mantenimiento, Vehiculo } = require('../models');

exports.combustible = async (req, res) => {
  try {
    const { desde, hasta, vehiculo_id } = req.query;
    const where = { estado: 'Surtida' };

    if (desde && hasta) {
      where.fecha_solicitud = { [Op.between]: [new Date(desde), new Date(hasta)] };
    }
    if (vehiculo_id) where.vehiculo_id = vehiculo_id;

    const data = await SolicitudCombustible.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('fecha_solicitud'), '%Y-%m'), 'periodo'],
        'vehiculo_id',
        [fn('COUNT', col('SolicitudCombustible.id')), 'cantidad'],
        [fn('COALESCE', fn('SUM', col('galones_surtidos')), 0), 'total_galones'],
        [fn('COALESCE', fn('SUM', col('costo_total')), 0), 'total_costo'],
        [fn('AVG', col('precio_por_galon')), 'precio_promedio']
      ],
      where,
      include: [{ association: 'vehiculo', attributes: ['placa', 'marca', 'modelo'] }],
      group: ['periodo', 'vehiculo_id'],
      order: [[fn('DATE_FORMAT', col('fecha_solicitud'), '%Y-%m'), 'DESC']]
    });

    res.json(data);
  } catch (error) {
    console.error('Error en reporte combustible:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.mantenimiento = async (req, res) => {
  try {
    const { desde, hasta, vehiculo_id } = req.query;
    const where = { estado: 'Completado' };

    if (desde && hasta) {
      where.fecha_realizada = { [Op.between]: [desde, hasta] };
    }
    if (vehiculo_id) where.vehiculo_id = vehiculo_id;

    const data = await Mantenimiento.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('fecha_realizada'), '%Y-%m'), 'periodo'],
        'vehiculo_id',
        'tipo_mantenimiento_id',
        [fn('COUNT', col('Mantenimiento.id')), 'cantidad'],
        [fn('COALESCE', fn('SUM', col('costo')), 0), 'total_costo']
      ],
      where,
      include: [
        { association: 'vehiculo', attributes: ['placa', 'marca', 'modelo'] },
        { association: 'tipo_mantenimiento', attributes: ['nombre'] }
      ],
      group: ['periodo', 'vehiculo_id', 'tipo_mantenimiento_id'],
      order: [[fn('DATE_FORMAT', col('fecha_realizada'), '%Y-%m'), 'DESC']]
    });

    res.json(data);
  } catch (error) {
    console.error('Error en reporte mantenimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.kilometraje = async (req, res) => {
  try {
    const vehiculos = await Vehiculo.findAll({
      where: { activo: 1 },
      attributes: ['id', 'placa', 'marca', 'modelo', 'ano', 'kilometraje_actual', 'estado'],
      include: [{ association: 'tipo_vehiculo', attributes: ['nombre'] }],
      order: [['kilometraje_actual', 'DESC']]
    });

    const data = await Promise.all(vehiculos.map(async (v) => {
      const ultimoMantenimiento = await Mantenimiento.findOne({
        where: { vehiculo_id: v.id, estado: 'Completado' },
        order: [['fecha_realizada', 'DESC']],
        attributes: ['fecha_realizada', 'kilometraje_realizado', 'tipo_mantenimiento_id'],
        include: [{ association: 'tipo_mantenimiento', attributes: ['nombre'] }]
      });

      const totalCombustible = await SolicitudCombustible.findOne({
        where: { vehiculo_id: v.id, estado: 'Surtida' },
        attributes: [
          [fn('COALESCE', fn('SUM', col('galones_surtidos')), 0), 'total_galones'],
          [fn('COALESCE', fn('SUM', col('costo_total')), 0), 'total_costo']
        ]
      });

      return {
        id: v.id,
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
        ano: v.ano,
        tipo: v.tipo_vehiculo?.nombre,
        kilometraje_actual: v.kilometraje_actual,
        estado: v.estado,
        ultimo_mantenimiento: ultimoMantenimiento ? {
          tipo: ultimoMantenimiento.tipo_mantenimiento?.nombre,
          fecha: ultimoMantenimiento.fecha_realizada,
          kilometraje: ultimoMantenimiento.kilometraje_realizado
        } : null,
        total_galones: parseFloat(totalCombustible?.dataValues?.total_galones) || 0,
        total_costo_combustible: parseFloat(totalCombustible?.dataValues?.total_costo) || 0
      };
    }));

    res.json(data);
  } catch (error) {
    console.error('Error en reporte kilometraje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
