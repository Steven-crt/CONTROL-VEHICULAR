const { Proveedor } = require('../models');
const { Op } = require('sequelize');
const { maskSensitiveData } = require('../middlewares/security');

exports.listar = async (req, res) => {
  try {
    const { buscar, tipo } = req.query;
    const where = { activo: 1 };

    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${buscar}%` } },
        { email: { [Op.like]: `%${buscar}%` } },
        { telefono: { [Op.like]: `%${buscar}%` } }
      ];
    }

    if (tipo) {
      where.tipo = tipo;
    }

    const proveedores = await Proveedor.findAll({ where, order: [['nombre', 'ASC']] });
    const result = maskSensitiveData(proveedores.map(p => p.toJSON()), req.usuario.rol);
    res.json(result);
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, telefono, email, direccion, tipo, observaciones } = req.body;

    const proveedor = await Proveedor.create({
      nombre, telefono, email, direccion, tipo, observaciones
    });

    const masked = maskSensitiveData(proveedor.toJSON(), req.usuario.rol);
    res.status(201).json(masked);
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    const result = maskSensitiveData(proveedor.toJSON(), req.usuario.rol);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const { nombre, telefono, email, direccion, tipo, observaciones } = req.body;
    await proveedor.update({ nombre, telefono, email, direccion, tipo, observaciones });

    const masked = maskSensitiveData(proveedor.toJSON(), req.usuario.rol);
    res.json(masked);
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    await proveedor.update({ activo: 0 });
    res.json({ mensaje: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
};
