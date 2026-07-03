const { Op } = require('sequelize');
const { Mantenimiento, Vehiculo, TipoMantenimiento, Usuario } = require('../models');
const { notificarAdmins } = require('../services/notificacionService');

exports.listar = async (req, res) => {
  try {
    const { estado, vehiculo_id, tipo_mantenimiento_id } = req.query;
    const where = {};

    if (estado) where.estado = estado;
    if (vehiculo_id) where.vehiculo_id = vehiculo_id;
    if (tipo_mantenimiento_id) where.tipo_mantenimiento_id = tipo_mantenimiento_id;

    const mantenimientos = await Mantenimiento.findAll({
      where,
      include: [
        { association: 'vehiculo', attributes: ['placa', 'marca', 'modelo'] },
        { association: 'tipo_mantenimiento', attributes: ['nombre', 'icono'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(mantenimientos);
  } catch (error) {
    console.error('Error en listar mantenimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.crear = async (req, res) => {
  try {
    const {
      vehiculo_id, tipo_mantenimiento_id, descripcion,
      kilometraje_programado, fecha_programada, costo, proveedor, observaciones
    } = req.body;

    if (!vehiculo_id || !tipo_mantenimiento_id) {
      return res.status(400).json({ error: 'Campos requeridos: vehiculo_id, tipo_mantenimiento_id' });
    }

    const count = await Mantenimiento.count();
    const codigo = `MT-${String(count + 1).padStart(5, '0')}`;

    const mantenimiento = await Mantenimiento.create({
      codigo,
      vehiculo_id,
      tipo_mantenimiento_id,
      descripcion,
      kilometraje_programado,
      fecha_programada: fecha_programada || new Date(),
      costo,
      proveedor,
      observaciones,
      atendido_por_id: req.usuario.id
    });

    const result = await Mantenimiento.findByPk(mantenimiento.id, {
      include: [
        { association: 'vehiculo', attributes: ['placa', 'marca', 'modelo'] },
        { association: 'tipo_mantenimiento', attributes: ['nombre', 'icono'] }
      ]
    });

    await Vehiculo.update({ estado: 'En Mantenimiento' }, { where: { id: vehiculo_id } });

    await notificarAdmins(
      'Nuevo mantenimiento programado',
      `Se programo ${result.tipo_mantenimiento?.nombre || 'mantenimiento'} para el vehiculo ${result.vehiculo?.placa} el ${fecha_programada || 'hoy'}`,
      'warning'
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Error en crear mantenimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id, {
      include: [
        { association: 'vehiculo', attributes: ['placa', 'marca', 'modelo', 'kilometraje_actual'] },
        { association: 'tipo_mantenimiento', attributes: ['nombre', 'descripcion', 'cada_km'] },
        { association: 'atendido_por', attributes: ['nombre', 'apellido'] }
      ]
    });

    if (!mantenimiento) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }

    res.json(mantenimiento);
  } catch (error) {
    console.error('Error en obtener mantenimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id);
    if (!mantenimiento) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }

    const {
      estado, descripcion, kilometraje_realizado, fecha_realizada,
      costo, proveedor, factura, observaciones
    } = req.body;

    const updateData = { atendido_por_id: req.usuario.id };

    if (estado) updateData.estado = estado;
    if (descripcion) updateData.descripcion = descripcion;
    if (kilometraje_realizado) updateData.kilometraje_realizado = kilometraje_realizado;
    if (fecha_realizada) updateData.fecha_realizada = fecha_realizada;
    if (costo) updateData.costo = costo;
    if (proveedor) updateData.proveedor = proveedor;
    if (factura) updateData.factura = factura;
    if (observaciones) updateData.observaciones = observaciones;

    await mantenimiento.update(updateData);

    if (estado === 'Completado') {
      const km = kilometraje_realizado || mantenimiento.kilometraje_realizado;
      if (km) {
        await Vehiculo.update({ kilometraje_actual: km, estado: 'Activo' }, { where: { id: mantenimiento.vehiculo_id } });
      } else {
        await Vehiculo.update({ estado: 'Activo' }, { where: { id: mantenimiento.vehiculo_id } });
      }
    }

    const result = await Mantenimiento.findByPk(mantenimiento.id, {
      include: [
        { association: 'vehiculo', attributes: ['placa', 'marca', 'modelo'] },
        { association: 'tipo_mantenimiento', attributes: ['nombre', 'icono'] }
      ]
    });

    res.json(result);
  } catch (error) {
    console.error('Error en actualizar mantenimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id);
    if (!mantenimiento) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }

    await mantenimiento.update({ estado: 'Cancelado' });
    res.json({ mensaje: 'Mantenimiento cancelado exitosamente' });
  } catch (error) {
    console.error('Error en eliminar mantenimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.proximos = async (req, res) => {
  try {
    const vehiculos = await Vehiculo.findAll({
      where: { activo: 1, estado: 'Activo' },
      include: [{ association: 'tipo_vehiculo', attributes: ['nombre'] }]
    });

    const tipos = await TipoMantenimiento.findAll({ where: { activo: 1 } });
    const recomendaciones = [];

    for (const vehiculo of vehiculos) {
      for (const tipo of tipos) {
        if (!tipo.cada_km && !tipo.cada_dias) continue;

        const ultimo = await Mantenimiento.findOne({
          where: { vehiculo_id: vehiculo.id, tipo_mantenimiento_id: tipo.id, estado: 'Completado' },
          order: [['fecha_realizada', 'DESC']]
        });

        let debeHacer = false;
        let razon = '';

        if (tipo.cada_km && ultimo) {
          const kmUltimo = parseFloat(ultimo.kilometraje_realizado) || 0;
          if (parseFloat(vehiculo.kilometraje_actual) - kmUltimo >= tipo.cada_km) {
            debeHacer = true;
            razon = `Kilometraje excedido (${tipo.cada_km} km)`;
          }
        }

        if (tipo.cada_dias && ultimo) {
          const diasDesde = Math.floor((new Date() - new Date(ultimo.fecha_realizada)) / (1000 * 60 * 60 * 24));
          if (diasDesde >= tipo.cada_dias) {
            debeHacer = true;
            razon = `Tiempo excedido (${tipo.cada_dias} dias)`;
          }
        }

        if (!ultimo) {
          if (tipo.cada_km && parseFloat(vehiculo.kilometraje_actual) >= tipo.cada_km) {
            debeHacer = true;
            razon = 'Nunca se ha realizado';
          }
        }

        if (debeHacer) {
          const existe = await Mantenimiento.findOne({
            where: {
              vehiculo_id: vehiculo.id,
              tipo_mantenimiento_id: tipo.id,
              estado: { [Op.in]: ['Programado', 'En Proceso'] }
            }
          });

          if (!existe) {
            recomendaciones.push({
              vehiculo: { id: vehiculo.id, placa: vehiculo.placa, marca: vehiculo.marca, modelo: vehiculo.modelo, tipo: vehiculo.tipo_vehiculo.nombre },
              tipo_mantenimiento: { id: tipo.id, nombre: tipo.nombre },
              razon,
              cada_km: tipo.cada_km,
              cada_dias: tipo.cada_dias,
              ultimo_realizado: ultimo?.fecha_realizada || null
            });
          }
        }
      }
    }

    res.json(recomendaciones);
  } catch (error) {
    console.error('Error en proximos mantenimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
