require('dotenv').config();
const app = require('./app');
const https = require('https');
const fs = require('fs');
const { constants } = require('crypto');
const { Server } = require('socket.io');
const selfsigned = require('selfsigned');

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5175';

async function createServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Intentar usar certificados configurados
  if (process.env.HTTPS_KEY_PATH && process.env.HTTPS_CERT_PATH) {
    return https.createServer(
      {
        key: fs.readFileSync(process.env.HTTPS_KEY_PATH),
        cert: fs.readFileSync(process.env.HTTPS_CERT_PATH),
        minVersion: 'TLSv1.3',
        secureOptions:
          constants.SSL_OP_NO_TLSv1 |
          constants.SSL_OP_NO_TLSv1_1 |
          constants.SSL_OP_NO_TLSv1_2
      },
      app
    );
  }

  // En produccion, no se permite iniciar sin certificados configurados
  if (isProduction) {
    throw new Error(
      'Entorno de produccion detectado. HTTPS es obligatorio. ' +
      'Configure HTTPS_KEY_PATH y HTTPS_CERT_PATH en sus variables de entorno.'
    );
  }

  // Generar certificado autofirmado para desarrollo
  console.warn('🔒 Generando certificado SSL autofirmado para desarrollo...');
  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    {
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [
        { name: 'basicConstraints', cA: false },
        { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
        { name: 'extKeyUsage', serverAuth: true },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '127.0.0.1' },
            { type: 7, ip: '::1' }
          ]
        }
      ]
    }
  );

  console.warn('⚠️  Usando certificado autofirmado (solo para desarrollo). Los navegadores mostraran una advertencia de seguridad.');

  return https.createServer(
    {
      key: pems.private,
      cert: pems.cert,
      minVersion: 'TLSv1.3',
      secureOptions:
        constants.SSL_OP_NO_TLSv1 |
        constants.SSL_OP_NO_TLSv1_1 |
        constants.SSL_OP_NO_TLSv1_2
    },
    app
  );
}

let server;
createServer().then(s => {
  server = s;

  const io = new Server(server, {
    cors: {
      origin: [FRONTEND_URL, 'http://localhost:5175', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Guardar referencia de io en app para usarlo en los controladores
  app.set('io', io);

  // Autenticación vía socket mediante token
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Token requerido'));
    }
    try {
      const jwt = require('jsonwebtoken');
      const { Usuario } = require('./models');
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('JWT_SECRET no configurado'));
      }
      const decoded = jwt.verify(token, secret);
      socket.usuarioId = decoded.id;
      socket.rol = decoded.rol;

      // Obtener nombre del usuario para usarlo en los eventos
      try {
        const usuario = await Usuario.findByPk(decoded.id, { attributes: ['nombre', 'apellido'] });
        if (usuario) {
          socket.usuarioNombre = `${usuario.nombre} ${usuario.apellido}`;
        }
      } catch {}

      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket conectado: usuario ${socket.usuarioId} (${socket.rol})`);

    // Admin se suscribe a todas las ubicaciones
    if (socket.rol === 'Administrador') {
      socket.join('admin-monitoreo');
      console.log(`Admin ${socket.usuarioId} unido a sala admin-monitoreo`);
    }

    // Empleado reporta su ubicación vía WebSocket
    socket.on('ubicacion:reportar', async (data) => {
      try {
        const { Ubicacion, Vehiculo, Asignacion } = require('./models');

        if (!data.vehiculo_id || data.latitud === undefined || data.longitud === undefined) {
          return socket.emit('error', { mensaje: 'Datos incompletos' });
        }

        // Verificar asignación
        const asignacion = await Asignacion.findOne({
          where: { usuario_id: socket.usuarioId, vehiculo_id: data.vehiculo_id }
        });

        if (!asignacion && socket.rol !== 'Administrador') {
          return socket.emit('error', { mensaje: 'Vehículo no asignado' });
        }

        const ubicacion = await Ubicacion.create({
          vehiculo_id: data.vehiculo_id,
          usuario_id: socket.usuarioId,
          latitud: data.latitud,
          longitud: data.longitud,
          velocidad: data.velocidad || 0,
          direccion: data.direccion || 0,
          precision_gps: data.precision_gps || 0,
          bateria: data.bateria || null,
          timestamp: new Date()
        });

        const vehiculo = await Vehiculo.findByPk(data.vehiculo_id, {
          include: [{ association: 'tipo_vehiculo', attributes: ['nombre', 'icono'] }]
        });

        const payload = {
          id: ubicacion.id,
          vehiculo_id: data.vehiculo_id,
          placa: vehiculo?.placa || '',
          marca: vehiculo?.marca || '',
          modelo: vehiculo?.modelo || '',
          ano: vehiculo?.ano || '',
          tipo_vehiculo: vehiculo?.tipo_vehiculo || null,
          empleado: socket.usuarioNombre || '',
          usuario_id: socket.usuarioId,
          latitud: parseFloat(data.latitud),
          longitud: parseFloat(data.longitud),
          velocidad: parseFloat(data.velocidad || 0),
          direccion: parseFloat(data.direccion || 0),
          precision_gps: parseFloat(data.precision_gps || 0),
          bateria: data.bateria ? parseFloat(data.bateria) : null,
          timestamp: new Date().toISOString()
        };

        // Emitir a todos los admins
        io.to('admin-monitoreo').emit('ubicacion:actualizada', payload);

        // Confirmar al empleado
        socket.emit('ubicacion:confirmada', { id: ubicacion.id, timestamp: ubicacion.timestamp });
      } catch (error) {
        console.error('Error en ubicacion:reportar socket:', error);
        socket.emit('error', { mensaje: 'Error al reportar ubicación' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket desconectado: usuario ${socket.usuarioId}`);
    });
  });

  server.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT} (HTTPS)`);
    console.log(`WebSocket habilitado`);
  });
}).catch(err => {
  console.error('Error al iniciar el servidor:', err.message);
  process.exit(1);
});

module.exports = { createServer };
