'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ubicaciones', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      vehiculo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vehiculos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      latitud: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false
      },
      longitud: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false
      },
      velocidad: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      direccion: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Heading en grados'
      },
      precision_gps: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Precision en metros'
      },
      bateria: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: null,
        comment: 'Nivel de bateria del dispositivo'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('ubicaciones', ['vehiculo_id'], {
      name: 'idx_ubicaciones_vehiculo'
    });
    await queryInterface.addIndex('ubicaciones', ['usuario_id'], {
      name: 'idx_ubicaciones_usuario'
    });
    await queryInterface.addIndex('ubicaciones', ['timestamp'], {
      name: 'idx_ubicaciones_timestamp'
    });
    await queryInterface.addIndex('ubicaciones', ['vehiculo_id', 'timestamp'], {
      name: 'idx_ubicaciones_vehiculo_timestamp'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ubicaciones');
  }
};
