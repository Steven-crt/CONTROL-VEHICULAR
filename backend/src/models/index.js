const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

// ==================== SEGURIDAD ====================

const Rol = sequelize.define('Rol', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  descripcion: DataTypes.STRING(255),
  permisos: DataTypes.JSON,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: DataTypes.DATE
}, {
  tableName: 'role',
  timestamps: false
});

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellido: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  telefono: {
    type: DataTypes.STRING(500),
    set(value) {
      if (value) {
        this.setDataValue('telefono', encrypt(value));
      }
    },
    get() {
      const raw = this.getDataValue('telefono');
      return raw ? decrypt(raw) : raw;
    }
  },
  rol_id: { type: DataTypes.INTEGER, allowNull: false },
  activo: { type: DataTypes.TINYINT, defaultValue: 1 },
  ultimo_acceso: DataTypes.DATE,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: DataTypes.DATE
}, {
  tableName: 'usuarios',
  timestamps: false
});

const Sesion = sequelize.define('Sesion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  token: { type: DataTypes.STRING(500), allowNull: false },
  tipo: { type: DataTypes.ENUM('access', 'refresh'), defaultValue: 'access' },
  ip_address: DataTypes.STRING(45),
  expires_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'sesiones',
  timestamps: false
});

// ==================== VEHICULOS ====================

const TipoVehiculo = sequelize.define('TipoVehiculo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  descripcion: DataTypes.STRING(255),
  icono: { type: DataTypes.STRING(50), defaultValue: 'truck' },
  activo: { type: DataTypes.TINYINT, defaultValue: 1 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: DataTypes.DATE
}, {
  tableName: 'tipos_vehiculo',
  timestamps: false
});

const Vehiculo = sequelize.define('Vehiculo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  placa: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  marca: { type: DataTypes.STRING(100), allowNull: false },
  modelo: { type: DataTypes.STRING(100), allowNull: false },
  ano: { type: DataTypes.INTEGER, allowNull: false },
  tipo_vehiculo_id: { type: DataTypes.INTEGER, allowNull: false },
  capacidad_combustible: DataTypes.DECIMAL(10, 2),
  color: DataTypes.STRING(50),
  numero_motor: {
    type: DataTypes.STRING(500),
    set(value) {
      if (value) {
        this.setDataValue('numero_motor', encrypt(value));
      }
    },
    get() {
      const raw = this.getDataValue('numero_motor');
      return raw ? decrypt(raw) : raw;
    }
  },
  numero_chasis: {
    type: DataTypes.STRING(500),
    set(value) {
      if (value) {
        this.setDataValue('numero_chasis', encrypt(value));
      }
    },
    get() {
      const raw = this.getDataValue('numero_chasis');
      return raw ? decrypt(raw) : raw;
    }
  },
  kilometraje_actual: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  estado: { type: DataTypes.ENUM('Activo', 'Inactivo', 'En Mantenimiento'), defaultValue: 'Activo' },
  foto: DataTypes.STRING(255),
  activo: { type: DataTypes.TINYINT, defaultValue: 1 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: DataTypes.DATE
}, {
  tableName: 'vehiculos',
  timestamps: false
});

// ==================== ASIGNACIONES ====================

const Asignacion = sequelize.define('Asignacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  vehiculo_id: { type: DataTypes.INTEGER, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'asignaciones',
  timestamps: false
});

// ==================== COMBUSTIBLE ====================

const SolicitudCombustible = sequelize.define('SolicitudCombustible', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  vehiculo_id: { type: DataTypes.INTEGER, allowNull: false },
  solicitante_id: { type: DataTypes.INTEGER, allowNull: false },
  galones_solicitados: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  galones_surtidos: DataTypes.DECIMAL(10, 2),
  costo_total: DataTypes.DECIMAL(12, 2),
  precio_por_galon: DataTypes.DECIMAL(10, 2),
  kilometraje_actual: DataTypes.DECIMAL(10, 2),
  estado: { type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Surtida'), defaultValue: 'Pendiente' },
  atendido_por_id: DataTypes.INTEGER,
  fecha_solicitud: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  fecha_atencion: DataTypes.DATE,
  observaciones: DataTypes.TEXT,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'solicitudes_combustible',
  timestamps: false
});

// ==================== MANTENIMIENTO ====================

const TipoMantenimiento = sequelize.define('TipoMantenimiento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  descripcion: DataTypes.STRING(255),
  icono: { type: DataTypes.STRING(50), defaultValue: 'wrench' },
  cada_km: DataTypes.INTEGER,
  cada_dias: DataTypes.INTEGER,
  activo: { type: DataTypes.TINYINT, defaultValue: 1 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: DataTypes.DATE
}, {
  tableName: 'tipos_mantenimiento',
  timestamps: false
});

const Mantenimiento = sequelize.define('Mantenimiento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  vehiculo_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_mantenimiento_id: { type: DataTypes.INTEGER, allowNull: false },
  descripcion: DataTypes.TEXT,
  kilometraje_programado: DataTypes.DECIMAL(10, 2),
  kilometraje_realizado: DataTypes.DECIMAL(10, 2),
  fecha_programada: DataTypes.DATEONLY,
  fecha_realizada: DataTypes.DATEONLY,
  costo: DataTypes.DECIMAL(12, 2),
  proveedor: DataTypes.STRING(255),
  factura: DataTypes.STRING(255),
  estado: { type: DataTypes.ENUM('Programado', 'En Proceso', 'Completado', 'Cancelado'), defaultValue: 'Programado' },
  observaciones: DataTypes.TEXT,
  atendido_por_id: DataTypes.INTEGER,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: DataTypes.DATE
}, {
  tableName: 'mantenimientos',
  timestamps: false
});

// ==================== AUDITORIA ====================

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  usuario_id: DataTypes.INTEGER,
  accion: { type: DataTypes.STRING(50), allowNull: false },
  tabla: { type: DataTypes.STRING(50), allowNull: false },
  registro_id: DataTypes.INTEGER,
  datos_anteriores: DataTypes.JSON,
  datos_nuevos: DataTypes.JSON,
  ip_address: DataTypes.STRING(45),
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'audit_log',
  timestamps: false
});

// ==================== PROVEEDORES ====================

const Proveedor = sequelize.define('Proveedor', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  telefono: {
    type: DataTypes.STRING(500),
    set(value) {
      if (value) {
        this.setDataValue('telefono', encrypt(value));
      }
    },
    get() {
      const raw = this.getDataValue('telefono');
      return raw ? decrypt(raw) : raw;
    }
  },
  email: {
    type: DataTypes.STRING(500),
    set(value) {
      if (value) {
        this.setDataValue('email', encrypt(value));
      }
    },
    get() {
      const raw = this.getDataValue('email');
      return raw ? decrypt(raw) : raw;
    }
  },
  direccion: DataTypes.TEXT,
  tipo: { type: DataTypes.ENUM('Taller', 'Gasolinera', 'Repuesto', 'Otro'), defaultValue: 'Otro' },
  observaciones: DataTypes.TEXT,
  activo: { type: DataTypes.TINYINT, defaultValue: 1 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: DataTypes.DATE
}, {
  tableName: 'proveedores',
  timestamps: false
});

// ==================== UBICACIONES (GPS TRACKING) ====================

const Ubicacion = sequelize.define('Ubicacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  vehiculo_id: { type: DataTypes.INTEGER, allowNull: false },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  latitud: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  longitud: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  velocidad: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  direccion: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  precision_gps: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  bateria: { type: DataTypes.DECIMAL(5, 2), defaultValue: null },
  timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'ubicaciones',
  timestamps: false
});

// ==================== NOTIFICACIONES ====================

const Notificacion = sequelize.define('Notificacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  titulo: { type: DataTypes.STRING(255), allowNull: false },
  mensaje: { type: DataTypes.TEXT, allowNull: false },
  tipo: { type: DataTypes.ENUM('info', 'success', 'warning', 'danger'), defaultValue: 'info' },
  leida: { type: DataTypes.TINYINT, defaultValue: 0 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'notificaciones',
  timestamps: false
});

// ==================== ASOCIACIONES ====================

Rol.hasMany(Usuario, { foreignKey: 'rol_id', as: 'usuarios' });
Usuario.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });

Usuario.belongsToMany(Vehiculo, { through: Asignacion, foreignKey: 'usuario_id', otherKey: 'vehiculo_id', as: 'vehiculos_asignados' });
Vehiculo.belongsToMany(Usuario, { through: Asignacion, foreignKey: 'vehiculo_id', otherKey: 'usuario_id', as: 'usuarios_asignados' });

Asignacion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Asignacion.belongsTo(Vehiculo, { foreignKey: 'vehiculo_id', as: 'vehiculo' });

Usuario.hasMany(Sesion, { foreignKey: 'usuario_id', as: 'sesiones' });
Sesion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

TipoVehiculo.hasMany(Vehiculo, { foreignKey: 'tipo_vehiculo_id', as: 'vehiculos' });
Vehiculo.belongsTo(TipoVehiculo, { foreignKey: 'tipo_vehiculo_id', as: 'tipo_vehiculo' });

Vehiculo.hasMany(SolicitudCombustible, { foreignKey: 'vehiculo_id', as: 'solicitudes_combustible' });
SolicitudCombustible.belongsTo(Vehiculo, { foreignKey: 'vehiculo_id', as: 'vehiculo' });

Usuario.hasMany(SolicitudCombustible, { foreignKey: 'solicitante_id', as: 'solicitudes_creadas' });
SolicitudCombustible.belongsTo(Usuario, { foreignKey: 'solicitante_id', as: 'solicitante' });

Usuario.hasMany(SolicitudCombustible, { foreignKey: 'atendido_por_id', as: 'solicitudes_atendidas' });
SolicitudCombustible.belongsTo(Usuario, { foreignKey: 'atendido_por_id', as: 'atendido_por' });

TipoMantenimiento.hasMany(Mantenimiento, { foreignKey: 'tipo_mantenimiento_id', as: 'mantenimientos' });
Mantenimiento.belongsTo(TipoMantenimiento, { foreignKey: 'tipo_mantenimiento_id', as: 'tipo_mantenimiento' });

Vehiculo.hasMany(Mantenimiento, { foreignKey: 'vehiculo_id', as: 'mantenimientos' });
Mantenimiento.belongsTo(Vehiculo, { foreignKey: 'vehiculo_id', as: 'vehiculo' });

Usuario.hasMany(Mantenimiento, { foreignKey: 'atendido_por_id', as: 'mantenimientos_atendidos' });
Mantenimiento.belongsTo(Usuario, { foreignKey: 'atendido_por_id', as: 'atendido_por' });

Usuario.hasMany(AuditLog, { foreignKey: 'usuario_id', as: 'audit_logs' });
AuditLog.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Usuario.hasMany(Notificacion, { foreignKey: 'usuario_id', as: 'notificaciones' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// ==================== ASOCIACIONES UBICACIONES ====================

Vehiculo.hasMany(Ubicacion, { foreignKey: 'vehiculo_id', as: 'ubicaciones' });
Ubicacion.belongsTo(Vehiculo, { foreignKey: 'vehiculo_id', as: 'vehiculo' });

Usuario.hasMany(Ubicacion, { foreignKey: 'usuario_id', as: 'ubicaciones_reportadas' });
Ubicacion.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Sesion,
  TipoVehiculo,
  Vehiculo,
  Asignacion,
  SolicitudCombustible,
  TipoMantenimiento,
  Mantenimiento,
  AuditLog,
  Proveedor,
  Notificacion,
  Ubicacion
};
