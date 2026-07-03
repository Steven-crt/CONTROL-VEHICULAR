const { Asignacion, Usuario, Vehiculo } = require('../models');

exports.misVehiculos = async (req, res) => {
  try {
    const asignaciones = await Asignacion.findAll({
      where: { usuario_id: req.usuario.id },
      include: [{ association: 'vehiculo', include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono'] }] }]
    });
    const vehiculos = asignaciones.map(a => a.vehiculo).filter(v => v && v.activo && v.estado === 'Activo');
    res.json(vehiculos);
  } catch (error) {
    console.error('Error en misVehiculos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.listar = async (req, res) => {
  try {
    const { vehiculo_id, usuario_id } = req.query;
    const where = {};
    if (vehiculo_id) where.vehiculo_id = vehiculo_id;
    if (usuario_id) where.usuario_id = usuario_id;

    const asignaciones = await Asignacion.findAll({
      where,
      include: [
        { association: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email'], include: [{ association: 'rol', attributes: ['nombre'] }] },
        { association: 'vehiculo', attributes: ['id', 'placa', 'marca', 'modelo'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(asignaciones);
  } catch (error) {
    console.error('Error en listar asignaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { usuario_id, vehiculo_id } = req.body;

    if (!usuario_id || !vehiculo_id) {
      return res.status(400).json({ error: 'Campos requeridos: usuario_id, vehiculo_id' });
    }

    const existe = await Asignacion.findOne({ where: { usuario_id, vehiculo_id } });
    if (existe) {
      return res.status(400).json({ error: 'El usuario ya tiene este vehiculo asignado' });
    }

    const asignacion = await Asignacion.create({ usuario_id, vehiculo_id });

    const result = await Asignacion.findByPk(asignacion.id, {
      include: [
        { association: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email'] },
        { association: 'vehiculo', attributes: ['id', 'placa', 'marca', 'modelo'] }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error en crear asignacion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const asignacion = await Asignacion.findByPk(req.params.id);
    if (!asignacion) {
      return res.status(404).json({ error: 'Asignacion no encontrada' });
    }

    await asignacion.destroy();
    res.json({ mensaje: 'Asignacion eliminada exitosamente' });
  } catch (error) {
    console.error('Error en eliminar asignacion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
