const bcrypt = require('bcryptjs');
const { TipoVehiculo, TipoMantenimiento, Rol, Usuario } = require('../models');

exports.tiposVehiculo = async (req, res) => {
  try {
    const tipos = await TipoVehiculo.findAll({ where: { activo: 1 }, order: [['nombre', 'ASC']] });
    res.json(tipos);
  } catch (error) {
    console.error('Error en tiposVehiculo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.tiposMantenimiento = async (req, res) => {
  try {
    const tipos = await TipoMantenimiento.findAll({ where: { activo: 1 }, order: [['nombre', 'ASC']] });
    res.json(tipos);
  } catch (error) {
    console.error('Error en tiposMantenimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.roles = async (req, res) => {
  try {
    const roles = await Rol.findAll({ order: [['nombre', 'ASC']] });
    res.json(roles);
  } catch (error) {
    console.error('Error en roles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      include: [{ association: 'rol', attributes: ['nombre'] }],
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    res.json(usuarios);
  } catch (error) {
    console.error('Error en listarUsuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, rol_id } = req.body;

    if (!nombre || !apellido || !email || !password || !rol_id) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, apellido, email, password, rol_id' });
    }

    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({
      nombre, apellido, email, password: hashedPassword, telefono, rol_id
    });

    const result = await Usuario.findByPk(usuario.id, {
      include: [{ association: 'rol', attributes: ['nombre'] }],
      attributes: { exclude: ['password'] }
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error en crearUsuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { nombre, apellido, email, password, telefono, rol_id, activo } = req.body;
    const updateData = {};

    if (nombre) updateData.nombre = nombre;
    if (apellido) updateData.apellido = apellido;
    if (email) updateData.email = email;
    if (telefono) updateData.telefono = telefono;
    if (rol_id) updateData.rol_id = rol_id;
    if (activo !== undefined) updateData.activo = activo;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await usuario.update(updateData);

    const result = await Usuario.findByPk(usuario.id, {
      include: [{ association: 'rol', attributes: ['nombre'] }],
      attributes: { exclude: ['password'] }
    });

    res.json(result);
  } catch (error) {
    console.error('Error en actualizarUsuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.eliminarUsuario = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await usuario.update({ activo: 0 });
    res.json({ mensaje: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('Error en eliminarUsuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
