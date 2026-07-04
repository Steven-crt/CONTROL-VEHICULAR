const { Op } = require('sequelize');
const { Ubicacion, Vehiculo, Usuario, Asignacion } = require('../models');
const sequelize = require('../config/database');

/**
 * POST /api/ubicaciones
 * Reportar la posición actual de un vehículo (empleado con GPS activado)
 */
exports.reportar = async (req, res) => {
  try {
    const { vehiculo_id, latitud, longitud, velocidad, direccion, precision_gps, bateria } = req.body;
    const usuario_id = req.usuario.id;

    if (!vehiculo_id || latitud === undefined || longitud === undefined) {
      return res.status(400).json({ error: 'Campos requeridos: vehiculo_id, latitud, longitud' });
    }

    // Verificar que el usuario tenga asignado este vehículo
    const asignacion = await Asignacion.findOne({
      where: { usuario_id, vehiculo_id }
    });

    if (!asignacion && req.usuario.rol !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes este vehículo asignado' });
    }

    const ubicacion = await Ubicacion.create({
      vehiculo_id,
      usuario_id,
      latitud,
      longitud,
      velocidad: velocidad || 0,
      direccion: direccion || 0,
      precision_gps: precision_gps || 0,
      bateria: bateria || null,
      timestamp: new Date()
    });

    // Emitir evento en tiempo real via Socket.io
    const io = req.app.get('io');
    if (io) {
      const vehiculo = await Vehiculo.findByPk(vehiculo_id, {
        include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono'] }]
      });
      const usuario = await Usuario.findByPk(usuario_id, { attributes: ['nombre', 'apellido'] });

      const payload = {
        id: ubicacion.id,
        vehiculo_id,
        placa: vehiculo?.placa || '',
        marca: vehiculo?.marca || '',
        modelo: vehiculo?.modelo || '',
        ano: vehiculo?.ano || '',
        tipo_vehiculo: vehiculo?.tipo_vehiculo || null,
        empleado: usuario ? `${usuario.nombre} ${usuario.apellido}` : '',
        usuario_id,
        latitud: parseFloat(latitud),
        longitud: parseFloat(longitud),
        velocidad: parseFloat(velocidad || 0),
        direccion: parseFloat(direccion || 0),
        precision_gps: parseFloat(precision_gps || 0),
        bateria: bateria ? parseFloat(bateria) : null,
        timestamp: new Date().toISOString()
      };

      io.to('admin-monitoreo').emit('ubicacion:actualizada', payload);
    }

    res.status(201).json({
      mensaje: 'Ubicación registrada',
      id: ubicacion.id,
      timestamp: ubicacion.timestamp
    });
  } catch (error) {
    console.error('Error en reportar ubicacion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ubicaciones/actuales
 * Obtener la última posición de cada vehículo con empleado asignado (admin)
 */
exports.actuales = async (req, res) => {
  try {
    // Obtener todos los vehículos activos con asignaciones
    const asignaciones = await Asignacion.findAll({
      include: [
        {
          association: 'vehiculo',
          where: { activo: 1, estado: 'Activo' },
          include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono'] }]
        },
        {
          association: 'usuario',
          attributes: ['id', 'nombre', 'apellido']
        }
      ]
    });

    // Para cada asignación, buscar la última ubicación
    const data = await Promise.all(asignaciones.map(async (asig) => {
      const vehiculo = asig.vehiculo;
      const usuario = asig.usuario;
      
      const ultimaUbicacion = await Ubicacion.findOne({
        where: { vehiculo_id: vehiculo.id },
        order: [['timestamp', 'DESC']],
        limit: 1
      });

      const baseData = {
        id: vehiculo.id,
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        ano: vehiculo.ano,
        tipo_vehiculo: vehiculo.tipo_vehiculo || null,
        empleado: `${usuario.nombre} ${usuario.apellido}`,
        usuario_id: usuario.id,
        velocidad: 0,
        direccion: 0,
        gps: false,
        status: 'offline'
      };

      if (ultimaUbicacion) {
        const timestamp = new Date(ultimaUbicacion.timestamp).getTime();
        const tiempoTranscurrido = Date.now() - timestamp;
        const gpsActivo = tiempoTranscurrido < 5 * 60 * 1000; // 5 min

        return {
          ...baseData,
          ubicacion_id: ultimaUbicacion.id,
          pos: { 
            lat: parseFloat(ultimaUbicacion.latitud), 
            lng: parseFloat(ultimaUbicacion.longitud) 
          },
          velocidad: parseFloat(ultimaUbicacion.velocidad),
          direccion: parseFloat(ultimaUbicacion.direccion),
          precision_gps: parseFloat(ultimaUbicacion.precision_gps),
          bateria: ultimaUbicacion.bateria ? parseFloat(ultimaUbicacion.bateria) : null,
          timestamp: ultimaUbicacion.timestamp,
          lastUpdate: timestamp,
          gps: gpsActivo,
          status: gpsActivo ? (ultimaUbicacion.velocidad > 5 ? 'moving' : 'stopped') : 'offline'
        };
      }

      return {
        ...baseData,
        pos: null,
        lastUpdate: Date.now()
      };
    }));

    res.json(data);
  } catch (error) {
    console.error('Error en ubicaciones actuales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ubicaciones/mis-vehiculos
 * Obtener las últimas ubicaciones de los vehículos asignados al empleado
 */
exports.misVehiculos = async (req, res) => {
  try {
    const asignaciones = await Asignacion.findAll({
      where: { usuario_id: req.usuario.id },
      include: [{
        association: 'vehiculo',
        include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono'] }]
      }]
    });

    const vehiculos = asignaciones
      .map(a => a.vehiculo)
      .filter(v => v && v.activo && v.estado === 'Activo');

    // Obtener última ubicación de cada vehículo
    const data = await Promise.all(vehiculos.map(async (v) => {
      try {
        const ultima = await Ubicacion.findOne({
          where: { vehiculo_id: v.id },
          order: [['timestamp', 'DESC']]
        });

        return {
          id: v.id,
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          ano: v.ano,
          tipo_vehiculo: v.tipo_vehiculo || null,
          pos: ultima ? { lat: parseFloat(ultima.latitud), lng: parseFloat(ultima.longitud) } : null,
          velocidad: ultima ? parseFloat(ultima.velocidad) : 0,
          direccion: ultima ? parseFloat(ultima.direccion) : 0,
          lastUpdate: ultima ? new Date(ultima.timestamp).getTime() : null,
          gps: !!ultima && (Date.now() - new Date(ultima.timestamp).getTime() < 300000) // 5 min
        };
      } catch (innerErr) {
        console.error('Error obteniendo ubicacion para vehiculo ' + v.id + ':', innerErr.message);
        return {
          id: v.id,
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          ano: v.ano,
          tipo_vehiculo: v.tipo_vehiculo || null,
          pos: null,
          velocidad: 0,
          direccion: 0,
          lastUpdate: null,
          gps: false
        };
      }
    }));

    res.json(data);
  } catch (error) {
    console.error('Error en mis vehiculos ubicaciones:', error);
    console.error('Stack:', error.stack);
    if (error.parent) {
      console.error('Error DB:', error.parent.message);
    }
    res.status(500).json({ 
      error: 'Error al cargar vehículos asignados',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/ubicaciones/:vehiculoId/historial
 * Obtener historial de ubicaciones de un vehículo
 */
exports.historial = async (req, res) => {
  try {
    const { vehiculoId } = req.params;
    const { desde, hasta, limite } = req.query;

    const where = { vehiculo_id: vehiculoId };

    if (desde || hasta) {
      where.timestamp = {};
      if (desde) where.timestamp[Op.gte] = new Date(desde);
      if (hasta) where.timestamp[Op.lte] = new Date(hasta);
    }

    const ubicaciones = await Ubicacion.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limite) || 100,
      include: [
        { association: 'usuario', attributes: ['nombre', 'apellido'] }
      ]
    });

    const data = ubicaciones.map(u => ({
      id: u.id,
      latitud: parseFloat(u.latitud),
      longitud: parseFloat(u.longitud),
      velocidad: parseFloat(u.velocidad),
      direccion: parseFloat(u.direccion),
      precision_gps: parseFloat(u.precision_gps),
      timestamp: u.timestamp,
      reportado_por: u.usuario ? `${u.usuario.nombre} ${u.usuario.apellido}` : 'Desconocido'
    }));

    res.json(data);
  } catch (error) {
    console.error('Error en historial ubicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
