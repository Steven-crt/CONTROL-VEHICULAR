'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Roles
    await queryInterface.createTable('role', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      descripcion: Sequelize.STRING(255),
      permisos: Sequelize.JSON,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: Sequelize.DATE
    });

    // Usuarios
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      apellido: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      telefono: Sequelize.STRING(20),
      rol_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'role', key: 'id' }
      },
      activo: { type: Sequelize.TINYINT, defaultValue: 1 },
      ultimo_acceso: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: Sequelize.DATE
    });

    // Sesiones
    await queryInterface.createTable('sesiones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE'
      },
      token: { type: Sequelize.STRING(500), allowNull: false },
      tipo: { type: Sequelize.ENUM('access', 'refresh'), defaultValue: 'access' },
      ip_address: Sequelize.STRING(45),
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Tipos de vehiculo
    await queryInterface.createTable('tipos_vehiculo', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      descripcion: Sequelize.STRING(255),
      icono: { type: Sequelize.STRING(50), defaultValue: 'truck' },
      activo: { type: Sequelize.TINYINT, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: Sequelize.DATE
    });

    // Vehiculos
    await queryInterface.createTable('vehiculos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      placa: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      marca: { type: Sequelize.STRING(100), allowNull: false },
      modelo: { type: Sequelize.STRING(100), allowNull: false },
      ano: { type: Sequelize.INTEGER, allowNull: false },
      tipo_vehiculo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'tipos_vehiculo', key: 'id' }
      },
      capacidad_combustible: Sequelize.DECIMAL(10, 2),
      color: Sequelize.STRING(50),
      numero_motor: Sequelize.STRING(100),
      numero_chasis: Sequelize.STRING(100),
      kilometraje_actual: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      estado: {
        type: Sequelize.ENUM('Activo', 'Inactivo', 'En Mantenimiento'),
        defaultValue: 'Activo'
      },
      foto: Sequelize.STRING(255),
      activo: { type: Sequelize.TINYINT, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: Sequelize.DATE
    });

    // Asignaciones
    await queryInterface.createTable('asignaciones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      usuario_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE'
      },
      vehiculo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vehiculos', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addConstraint('asignaciones', {
      fields: ['usuario_id', 'vehiculo_id'],
      type: 'unique',
      name: 'uk_usuario_vehiculo'
    });

    // Solicitudes de combustible
    await queryInterface.createTable('solicitudes_combustible', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      codigo: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      vehiculo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vehiculos', key: 'id' }
      },
      solicitante_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'usuarios', key: 'id' }
      },
      galones_solicitados: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      galones_surtidos: Sequelize.DECIMAL(10, 2),
      costo_total: Sequelize.DECIMAL(12, 2),
      precio_por_galon: Sequelize.DECIMAL(10, 2),
      kilometraje_actual: Sequelize.DECIMAL(10, 2),
      estado: {
        type: Sequelize.ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Surtida'),
        defaultValue: 'Pendiente'
      },
      atendido_por_id: {
        type: Sequelize.INTEGER,
        references: { model: 'usuarios', key: 'id' }
      },
      fecha_solicitud: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      fecha_atencion: Sequelize.DATE,
      observaciones: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Tipos de mantenimiento
    await queryInterface.createTable('tipos_mantenimiento', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      descripcion: Sequelize.STRING(255),
      icono: { type: Sequelize.STRING(50), defaultValue: 'wrench' },
      cada_km: Sequelize.INTEGER,
      cada_dias: Sequelize.INTEGER,
      activo: { type: Sequelize.TINYINT, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: Sequelize.DATE
    });

    // Mantenimientos
    await queryInterface.createTable('mantenimientos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      codigo: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      vehiculo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vehiculos', key: 'id' }
      },
      tipo_mantenimiento_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'tipos_mantenimiento', key: 'id' }
      },
      descripcion: Sequelize.TEXT,
      kilometraje_programado: Sequelize.DECIMAL(10, 2),
      kilometraje_realizado: Sequelize.DECIMAL(10, 2),
      fecha_programada: Sequelize.DATEONLY,
      fecha_realizada: Sequelize.DATEONLY,
      costo: Sequelize.DECIMAL(12, 2),
      proveedor: Sequelize.STRING(255),
      factura: Sequelize.STRING(255),
      estado: {
        type: Sequelize.ENUM('Programado', 'En Proceso', 'Completado', 'Cancelado'),
        defaultValue: 'Programado'
      },
      observaciones: Sequelize.TEXT,
      atendido_por_id: {
        type: Sequelize.INTEGER,
        references: { model: 'usuarios', key: 'id' }
      },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: Sequelize.DATE
    });

    // Audit log
    await queryInterface.createTable('audit_log', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      usuario_id: {
        type: Sequelize.INTEGER,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      accion: { type: Sequelize.STRING(50), allowNull: false },
      tabla: { type: Sequelize.STRING(50), allowNull: false },
      registro_id: Sequelize.INTEGER,
      datos_anteriores: Sequelize.JSON,
      datos_nuevos: Sequelize.JSON,
      ip_address: Sequelize.STRING(45),
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Indices
    await queryInterface.addIndex('sesiones', ['usuario_id']);
    await queryInterface.addIndex('sesiones', ['token']);
    await queryInterface.addIndex('vehiculos', ['estado']);
    await queryInterface.addIndex('solicitudes_combustible', ['estado']);
    await queryInterface.addIndex('solicitudes_combustible', ['vehiculo_id']);
    await queryInterface.addIndex('solicitudes_combustible', ['solicitante_id']);
    await queryInterface.addIndex('mantenimientos', ['estado']);
    await queryInterface.addIndex('mantenimientos', ['fecha_programada']);
    await queryInterface.addIndex('audit_log', ['usuario_id']);
    await queryInterface.addIndex('audit_log', ['tabla', 'registro_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_log');
    await queryInterface.dropTable('mantenimientos');
    await queryInterface.dropTable('tipos_mantenimiento');
    await queryInterface.dropTable('solicitudes_combustible');
    await queryInterface.dropTable('asignaciones');
    await queryInterface.dropTable('vehiculos');
    await queryInterface.dropTable('tipos_vehiculo');
    await queryInterface.dropTable('sesiones');
    await queryInterface.dropTable('usuarios');
    await queryInterface.dropTable('role');
  }
};
