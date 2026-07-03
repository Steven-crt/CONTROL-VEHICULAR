require('dotenv').config();
const { sequelize, Usuario, Rol, TipoVehiculo, TipoMantenimiento } = require('../src/models');
const fs = require('fs');
const path = require('path');

async function exportData() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conectado a la base de datos');

    let sql = '-- Control Vehicular Database Data\n';
    sql += `-- Exported at: ${new Date().toISOString()}\n\n`;
    sql += 'SET FOREIGN_KEY_CHECKS=0;\n\n';

    // Export Roles
    sql += '-- Roles\n';
    const roles = await Rol.findAll({ attributes: ['id', 'nombre', 'descripcion', 'permisos'] });
    for (const role of roles) {
      const permisos = JSON.stringify(role.permisos).replace(/'/g, "\\'");
      sql += `INSERT INTO role (id, nombre, descripcion, permisos, created_at) VALUES (${role.id}, '${role.nombre}', '${role.descripcion}', '${permisos}', '${role.created_at}');\n`;
    }
    sql += '\n';

    // Export Usuarios (sin passwords)
    sql += '-- Usuarios\n';
    const usuarios = await Usuario.findAll({ 
      attributes: ['id', 'nombre', 'apellido', 'email', 'telefono', 'rol_id', 'activo', 'ultimo_acceso', 'created_at', 'updated_at'] 
    });
    for (const usuario of usuarios) {
      sql += `INSERT INTO usuarios (id, nombre, apellido, email, telefono, rol_id, activo, ultimo_acceso, created_at, updated_at) VALUES (${usuario.id}, '${usuario.nombre}', '${usuario.apellido}', '${usuario.email}', '${usuario.telefono}', ${usuario.rol_id}, ${usuario.activo}, ${usuario.ultimo_acceso ? '\'' + usuario.ultimo_acceso + '\'' : 'NULL'}, '${usuario.created_at}', ${usuario.updated_at ? '\'' + usuario.updated_at + '\'' : 'NULL'});\n`;
    }
    sql += '\n';

    // Export Tipos de Vehiculo
    sql += '-- Tipos de Vehiculo\n';
    const tiposVehiculo = await TipoVehiculo.findAll({ attributes: ['id', 'nombre', 'descripcion', 'icono', 'activo'] });
    for (const tv of tiposVehiculo) {
      sql += `INSERT INTO tipos_vehiculo (id, nombre, descripcion, icono, activo) VALUES (${tv.id}, '${tv.nombre}', '${tv.descripcion}', '${tv.icono}', ${tv.activo});\n`;
    }
    sql += '\n';

    // Export Tipos de Mantenimiento
    sql += '-- Tipos de Mantenimiento\n';
    const tiposMantenimiento = await TipoMantenimiento.findAll({ attributes: ['id', 'nombre', 'descripcion', 'icono', 'cada_km', 'cada_dias', 'activo'] });
    for (const tm of tiposMantenimiento) {
      sql += `INSERT INTO tipos_mantenimiento (id, nombre, descripcion, icono, cada_km, cada_dias, activo) VALUES (${tm.id}, '${tm.nombre}', '${tm.descripcion}', '${tm.icono}', ${tm.cada_km || 'NULL'}, ${tm.cada_dias || 'NULL'}, ${tm.activo});\n`;
    }

    sql += '\nSET FOREIGN_KEY_CHECKS=1;\n';

    const outputPath = path.join(__dirname, 'database-data.sql');
    fs.writeFileSync(outputPath, sql);
    console.log('✓ Datos exportados a:', outputPath);
    console.log('\nCredenciales para el seed:');
    console.log('  Admin: admin@controlvehicular.com / Admin@123');
    console.log('  Empleado: empleado@controlvehicular.com / Empleado@123');

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n💡 Si hay error de acceso, verifica tu contraseña en backend/.env');
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

exportData();
