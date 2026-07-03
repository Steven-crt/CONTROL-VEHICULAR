require('dotenv').config();
const { sequelize } = require('../src/models');
const fs = require('fs');
const path = require('path');

async function exportSchema() {
  try {
    const models = [
      'Rol', 'Usuario', 'Sesion', 
      'TipoVehiculo', 'Vehiculo', 'Asignacion',
      'SolicitudCombustible',
      'TipoMantenimiento', 'Mantenimiento',
      'AuditLog',
      'Proveedor',
      'Notificacion',
      'Ubicacion'
    ];

    let sql = '-- Control Vehicular Database Schema\n';
    sql += `-- Exported at: ${new Date().toISOString()}\n\n`;
    sql += 'SET FOREIGN_KEY_CHECKS=0;\n\n';

    for (const modelName of models) {
      const model = require('../src/models')[modelName];
      if (model) {
        sql += `DROP TABLE IF EXISTS ${model.tableName};\n`;
        const query = `SHOW CREATE TABLE ${model.tableName}`;
        const [results] = await sequelize.query(query);
        if (results && results[0]) {
          sql += results[0]['Create Table'] + ';\n\n';
        }
      }
    }

    sql += 'SET FOREIGN_KEY_CHECKS=1;\n';

    const outputPath = path.join(__dirname, 'database-schema.sql');
    fs.writeFileSync(outputPath, sql);
    console.log('✓ Schema exportado a:', outputPath);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

exportSchema();
