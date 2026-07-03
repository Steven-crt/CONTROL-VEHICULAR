require('dotenv').config();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no configurado en variables de entorno`);
  }
  return value;
}

const databaseConfig = {
  username: requiredEnv('DB_USER'),
  password: requiredEnv('DB_PASSWORD'),
  database: requiredEnv('DB_NAME'),
  host: requiredEnv('DB_HOST'),
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: false
};

module.exports = {
  development: databaseConfig,
  test: databaseConfig,
  production: databaseConfig
};
