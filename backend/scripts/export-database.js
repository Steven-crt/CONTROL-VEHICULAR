require('dotenv').config();
const { sequelize, Rol, Usuario, TipoVehiculo, TipoMantenimiento } = require('../src/models');
const fs = require('fs');
const path = require('path');

async function exportAll() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectado a la base de datos');

    // Schema
    let schemaSql = '-- Control Vehicular Database Schema\n';
    schemaSql += `-- Exported at: ${new Date().toISOString()}\n\n`;
    schemaSql += 'SET FOREIGN_KEY_CHECKS=0;\n\n';

    const models = ['role', 'usuarios', 'sesiones', 'tipos_vehiculo', 'vehiculos', 'asignaciones', 'solicitudes_combustible', 'tipos_mantenimiento', 'mantenimientos', 'audit_log', 'proveedores', 'notificaciones', 'ubicaciones'];

    for (const table of models) {
      schemaSql += `DROP TABLE IF EXISTS ${table};\n`;
      const [results] = await sequelize.query(`SHOW CREATE TABLE ${table}`);
      if (results && results[0]) {
        schemaSql += results[0]['Create Table'] + ';\n\n';
      }
    }
    schemaSql += 'SET FOREIGN_KEY_CHECKS=1;\n';

    const schemaPath = path.join(__dirname, 'database-schema.sql');
    fs.writeFileSync(schemaPath, schemaSql);
    console.log('✓ Schema exportado a:', schemaPath);

    // Data
    let dataSql = '-- Control Vehicular Database Data\n';
    dataSql += `-- Exported at: ${new Date().toISOString()}\n\n`;
    dataSql += 'SET FOREIGN_KEY_CHECKS=0;\n\n';

    // Roles
    const roles = await Rol.findAll({ attributes: ['id', 'nombre', 'descripcion', 'permisos'] });
    for (const role of roles) {
      const permisos = JSON.stringify(role.permisos).replace(/'/g, "\\'");
      dataSql += `INSERT INTO role (id, nombre, descripcion, permisos, created_at) VALUES (${role.id}, '${role.nombre}', '${role.descripcion}', '${permisos}', '${role.created_at}');\n`;
    }

    // Usuarios
    const usuarios = await Usuario.findAll({ 
      attributes: ['id', 'nombre', 'apellido', 'email', 'telefono', 'rol_id', 'activo', 'ultimo_acceso', 'created_at', 'updated_at'] 
    });
    for (const usuario of usuarios) {
      const ultimoAcceso = usuario.ultimo_acceso ? '\'' + usuario.ultimo_acceso + '\'' : 'NULL';
      const updated = usuario.updated_at ? '\'' + usuario.updated_at + '\'' : 'NULL';
      dataSql += `INSERT INTO usuarios (id, nombre, apellido, email, telefono, rol_id, activo, ultimo_acceso, created_at, updated_at) VALUES (${usuario.id}, '${usuario.nombre}', '${usuario.apellido}', '${usuario.email}', '${usuario.telefono}', ${usuario.rol_id}, ${usuario.activo}, ${ultimoAcceso}, '${usuario.created_at}', ${updated});\n`;
    }

    // Tipos de Vehiculo
    const tiposVehiculo = await TipoVehiculo.findAll({ attributes: ['id', 'nombre', 'descripcion', 'icono', 'activo'] });
    for (const tv of tiposVehiculo) {
      dataSql += `INSERT INTO tipos_vehiculo (id, nombre, descripcion, icono, activo) VALUES (${tv.id}, '${tv.nombre}', '${tv.descripcion}', '${tv.icono}', ${tv.activo});\n`;
    }

    // Tipos de Mantenimiento
    const tiposMantenimiento = await TipoMantenimiento.findAll({ attributes: ['id', 'nombre', 'descripcion', 'icono', 'cada_km', 'cada_dias', 'activo'] });
    for (const tm of tiposMantenimiento) {
      const cadaKm = tm.cada_km || 'NULL';
      const cadaDias = tm.cada_dias || 'NULL';
      dataSql += `INSERT INTO tipos_mantenimiento (id, nombre, descripcion, icono, cada_km, cada_dias, activo) VALUES (${tm.id}, '${tm.nombre}', '${tm.descripcion}', '${tm.icono}', ${cadaKm}, ${cadaDias}, ${tm.activo});\n`;
    }

    dataSql += '\nSET FOREIGN_KEY_CHECKS=1;\n';

    const dataPath = path.join(__dirname, 'database-data.sql');
    fs.writeFileSync(dataPath, dataSql);
    console.log('✓ Datos exportados a:', dataPath);

    console.log('\n✓ Exportación completa!');
    console.log('\nCredenciales admin:');
    console.log('  Email: admin@controlvehicular.com');
    console.log('  Password: Admin@123');

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.log('\n💡 Verifica tu contraseña en backend/.env');
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

exportAll();
