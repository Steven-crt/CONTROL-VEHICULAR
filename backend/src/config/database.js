const { Sequelize } = require('sequelize');
require('dotenv').config();

const isServerless = !process.env.PORT && process.env.VERCEL;

const sequelize = new Sequelize(
  process.env.DB_NAME || 'defaultdb',
  process.env.DB_USER || '',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: isServerless ? 2 : 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 30000,
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    retry: {
      max: 3
    },
    define: {
      timestamps: false,
      underscored: true
    }
  }
);

module.exports = sequelize;
