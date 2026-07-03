const { Notificacion } = require('../models');

async function crearNotificacion(usuario_id, titulo, mensaje, tipo = 'info') {
  try {
    await Notificacion.create({ usuario_id, titulo, mensaje, tipo });
  } catch (error) {
    console.error('Error al crear notificacion:', error.message);
  }
}

async function notificarAdmins(titulo, mensaje, tipo = 'info') {
  try {
    const { Usuario, Rol } = require('../models');
    const adminRole = await Rol.findOne({ where: { nombre: 'Administrador' } });
    if (!adminRole) return;

    const admins = await Usuario.findAll({
      where: { rol_id: adminRole.id, activo: 1 },
      attributes: ['id']
    });

    for (const admin of admins) {
      await Notificacion.create({
        usuario_id: admin.id,
        titulo,
        mensaje,
        tipo
      });
    }
  } catch (error) {
    console.error('Error al notificar admins:', error.message);
  }
}

module.exports = { crearNotificacion, notificarAdmins };
