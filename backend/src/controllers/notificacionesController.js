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

exports.solicitarVehiculo = async (req, res) => {
  try {
    const { Usuario, Rol } = require('../models');

    // Buscar todos los administradores
    const adminRole = await Rol.findOne({ where: { nombre: 'Administrador' } });
    if (!adminRole) {
      return res.status(500).json({ error: 'No hay administradores registrados' });
    }

    const admins = await Usuario.findAll({
      where: { rol_id: adminRole.id, activo: 1 }
    });

    if (admins.length === 0) {
      return res.status(500).json({ error: 'No hay administradores disponibles' });
    }

    // Crear notificación para cada admin
    const notificaciones = admins.map(admin => ({
      usuario_id: admin.id,
      titulo: 'Solicitud de Vehículo',
      mensaje: `El empleado ${req.usuario.nombre} ${req.usuario.apellido} (${req.usuario.email}) solicita que se le asigne un vehículo.`,
      tipo: 'info',
      leida: 0
    }));

    await Notificacion.bulkCreate(notificaciones);

    res.json({ mensaje: 'Solicitud enviada al administrador correctamente' });
  } catch (error) {
    console.error('Error en solicitarVehiculo:', error);
    res.status(500).json({ error: 'Error al enviar solicitud' });
  }
};

exports.solicitudesPendientes = async (req, res) => {
  try {
    const solicitudes = await Notificacion.findAll({
      where: {
        usuario_id: req.usuario.id,
        titulo: 'Solicitud de Vehículo',
        leida: 0
      },
      order: [['created_at', 'DESC']],
      limit: 20
    });

    // Extraer datos únicos del mensaje para agrupar solicitudes
    const agrupadas = [];
    const vistos = new Set();

    for (const s of solicitudes) {
      // Extraer email del mensaje para identificar al solicitante
      const match = s.mensaje.match(/\(([^)]+@[^)]+)\)/);
      if (match && !vistos.has(match[1])) {
        vistos.add(match[1]);
        agrupadas.push({
          id: s.id,
          mensaje: s.mensaje,
          created_at: s.created_at,
          leida: s.leida
        });
      }
    }

    res.json(agrupadas);
  } catch (error) {
    console.error('Error en solicitudesPendientes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};
