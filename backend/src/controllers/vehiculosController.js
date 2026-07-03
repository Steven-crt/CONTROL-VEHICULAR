const { Op } = require('sequelize');
const { Vehiculo, TipoVehiculo, SolicitudCombustible, Mantenimiento } = require('../models');
const { maskSensitiveData } = require('../middlewares/security');

exports.listar = async (req, res) => {
  try {
    const { estado, tipo_vehiculo_id, busqueda } = req.query;
    const where = {};

    if (req.usuario.rol !== 'Administrador') {
      where.estado = 'Activo';
    }

    if (estado) where.estado = estado;
    if (tipo_vehiculo_id) where.tipo_vehiculo_id = tipo_vehiculo_id;
    if (busqueda) {
      where[Op.or] = [
        { placa: { [Op.like]: `%${busqueda}%` } },
        { marca: { [Op.like]: `%${busqueda}%` } },
        { modelo: { [Op.like]: `%${busqueda}%` } }
      ];
    }

    const vehiculos = await Vehiculo.findAll({
      where,
      include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono'] }],
      order: [['created_at', 'DESC']]
    });

    const result = maskSensitiveData(vehiculos.map(v => v.toJSON()), req.usuario.rol);
    res.json(result);
  } catch (error) {
    console.error('Error en listar vehiculos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.crear = async (req, res) => {
  try {
    const {
      placa, marca, modelo, ano, tipo_vehiculo_id, capacidad_combustible,
      color, numero_motor, numero_chasis, kilometraje_actual, estado
    } = req.body;

    if (!placa || !marca || !modelo || !ano || !tipo_vehiculo_id) {
      return res.status(400).json({ error: 'Campos requeridos: placa, marca, modelo, ano, tipo_vehiculo_id' });
    }

    const existe = await Vehiculo.findOne({ where: { placa } });
    if (existe) {
      return res.status(400).json({ error: 'Ya existe un vehiculo con esa placa' });
    }

    const vehiculo = await Vehiculo.create({
      placa, marca, modelo, ano, tipo_vehiculo_id,
      capacidad_combustible, color, numero_motor, numero_chasis,
      kilometraje_actual: kilometraje_actual || 0,
      estado: estado || 'Activo'
    });

    const result = await Vehiculo.findByPk(vehiculo.id, {
      include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono'] }]
    });

    const masked = maskSensitiveData(result.toJSON(), req.usuario.rol);
    res.status(201).json(masked);
  } catch (error) {
    console.error('Error en crear vehiculo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByPk(req.params.id, {
      include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono', 'descripcion'] }]
    });

    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehiculo no encontrado' });
    }

    const result = maskSensitiveData(vehiculo.toJSON(), req.usuario.rol);
    res.json(result);
  } catch (error) {
    console.error('Error en obtener vehiculo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByPk(req.params.id);
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehiculo no encontrado' });
    }

    await vehiculo.update(req.body);

    const result = await Vehiculo.findByPk(vehiculo.id, {
      include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono'] }]
    });

    const masked = maskSensitiveData(result.toJSON(), req.usuario.rol);
    res.json(masked);
  } catch (error) {
    console.error('Error en actualizar vehiculo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByPk(req.params.id);
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehiculo no encontrado' });
    }

    const nuevoEstado = vehiculo.estado === 'Activo' ? 'Inactivo' : 'Activo';
    await vehiculo.update({ activo: nuevoEstado === 'Activo' ? 1 : 0, estado: nuevoEstado });
    res.json({ mensaje: `Vehiculo ${nuevoEstado.toLowerCase()}`, estado: nuevoEstado });
  } catch (error) {
    console.error('Error en eliminar vehiculo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.historialCombustible = async (req, res) => {
  try {
    const { id } = req.params;
    const historial = await SolicitudCombustible.findAll({
      where: { vehiculo_id: id },
      include: [
        { association: 'solicitante', attributes: ['nombre', 'apellido'] },
        { association: 'atendido_por', attributes: ['nombre', 'apellido'] }
      ],
      order: [['fecha_solicitud', 'DESC']]
    });

    res.json(historial);
  } catch (error) {
    console.error('Error en historialCombustible:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.mantenimientos = async (req, res) => {
  try {
    const { id } = req.params;
    const mantenimientos = await Mantenimiento.findAll({
      where: { vehiculo_id: id },
      include: [{ association: 'tipo_mantenimiento', attributes: ['nombre', 'icono'] }],
      order: [['created_at', 'DESC']]
    });

    res.json(mantenimientos);
  } catch (error) {
    console.error('Error en mantenimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
