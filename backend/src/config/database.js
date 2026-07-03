const { Sequelize } = require('sequelize');
require('dotenv').config();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no configurado en variables de entorno`);
  }
  return value;
}

const isServerless = !process.env.PORT && process.env.VERCEL;

const sequelize = new Sequelize(
  requiredEnv('DB_NAME'),
  requiredEnv('DB_USER'),
  process.env.DB_PASSWORD || '',
  {
    host: requiredEnv('DB_HOST'),
    port: process.env.DB_PORT || 3306,
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
