const request = require('supertest');
const app = require('../src/app');
const { sequelize, Rol, Usuario } = require('../src/models');
const bcrypt = require('bcryptjs');

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await Rol.create({
    nombre: 'Administrador',
    descripcion: 'Admin test',
    permisos: { all: true }
  });

  await Rol.create({
    nombre: 'Empleado',
    descripcion: 'Empleado test',
    permisos: { vehiculos: 'read_create', solicitudes: 'create_read_own', mantenimientos: 'read_create', reportes: 'read' }
  });

  const adminRole = await Rol.findOne({ where: { nombre: 'Administrador' } });
  const hashedPassword = await bcrypt.hash(process.env.TEST_ADMIN_PASSWORD, 10);

  await Usuario.create({
    nombre: 'Test',
    apellido: 'Admin',
    email: process.env.TEST_ADMIN_EMAIL,
    password: hashedPassword,
    rol_id: adminRole.id,
    activo: 1
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Auth Endpoints', () => {
  let token;
  let refreshToken;

  test('POST /api/auth/login - credenciales validas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('usuario');
    expect(res.body.usuario.rol).toBe('Administrador');

    token = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  test('POST /api/auth/login - credenciales invalidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_WRONG_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/auth/login - usuario inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: process.env.TEST_INVALID_EMAIL, password: process.env.TEST_INVALID_PASSWORD });

    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me - con token valido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.usuario.email).toBe(process.env.TEST_ADMIN_EMAIL);
  });

  test('GET /api/auth/me - sin token', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  test('POST /api/auth/refresh - token valido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
  });

  test('POST /api/auth/refresh - token invalido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: process.env.TEST_INVALID_REFRESH_TOKEN });

    expect(res.status).toBe(401);
  });

  test('POST /api/auth/logout - con token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
