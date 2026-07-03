const { AuditLog } = require('../models');

/**
 * Middleware de auditoria - registra acciones CRUD en la base de datos.
 * 
 * Uso: colocar despues del middleware de autenticacion en rutas que modifican datos.
 * 
 * Ejemplo:
 *   router.post('/', autenticar, autorizar('Administrador'), registrarAccion('vehiculos', 'crear'), controller.crear);
 *   router.put('/:id', autenticar, autorizar('Administrador'), registrarAccion('vehiculos', 'actualizar'), controller.actualizar);
 *   router.delete('/:id', autenticar, autorizar('Administrador'), registrarAccion('vehiculos', 'eliminar'), controller.eliminar);
 */
function registrarAccion(tabla, accion) {
  return async (req, res, next) => {
    const originalSend = res.json.bind(res);

    res.json = async function (body) {
      try {
        const usuario_id = req.usuario?.id || null;
        const ip_address = req.ip || req.connection?.remoteAddress || '0.0.0.0';
        const registro_id = req.params?.id || body?.id || null;

        let datos_nuevos = null;
        if (accion === 'crear' && body && body.id) {
          datos_nuevos = body;
        } else if (accion === 'actualizar' && req.body) {
          datos_nuevos = req.body;
        }

        await AuditLog.create({
          usuario_id,
          accion,
          tabla,
          registro_id,
          datos_anteriores: null,
          datos_nuevos,
          ip_address
        });
      } catch (error) {
        console.error('Error en auditoria:', error.message);
      }

      return originalSend(body);
    };

    next();
  };
}

module.exports = { registrarAccion };
