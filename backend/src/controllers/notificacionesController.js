const { Notificacion } = require('../models');

exports.listar = async (req, res) => {
  try {
    const notificaciones = await Notificacion.findAll({
      where: { usuario_id: req.usuario.id },
      order: [['created_at', 'DESC']],
      limit: 50
    });

    const noLeidas = await Notificacion.count({
      where: { usuario_id: req.usuario.id, leida: 0 }
    });

    res.json({ notificaciones, noLeidas });
  } catch (error) {
    console.error('Error al listar notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

exports.marcarLeida = async (req, res) => {
  try {
    const notificacion = await Notificacion.findOne({
      where: { id: req.params.id, usuario_id: req.usuario.id }
    });

    if (!notificacion) {
      return res.status(404).json({ error: 'Notificacion no encontrada' });
    }

    await notificacion.update({ leida: 1 });
    res.json({ mensaje: 'Notificacion marcada como leida' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar notificacion' });
  }
};

exports.marcarTodasLeidas = async (req, res) => {
  try {
    await Notificacion.update(
      { leida: 1 },
      { where: { usuario_id: req.usuario.id, leida: 0 } }
    );
    res.json({ mensaje: 'Todas las notificaciones marcadas como leidas' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar notificaciones' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const notificacion = await Notificacion.findOne({
      where: { id: req.params.id, usuario_id: req.usuario.id }
    });

    if (!notificacion) {
      return res.status(404).json({ error: 'Notificacion no encontrada' });
    }

    await notificacion.destroy();
    res.json({ mensaje: 'Notificacion eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar notificacion' });
  }
};
