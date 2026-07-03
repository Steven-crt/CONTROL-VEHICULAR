const request = require('supertest');
const app = require('../src/app');
const { sequelize, Rol, Usuario, TipoVehiculo } = require('../src/models');
const bcrypt = require('bcryptjs');

let adminToken;
let empleadoToken;
let tipoVehiculoId;

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
    permisos: { vehiculos: 'read_create' }
  });

  const adminRole = await Rol.findOne({ where: { nombre: 'Administrador' } });
  const empleadoRole = await Rol.findOne({ where: { nombre: 'Empleado' } });

  const hashedPassword = await bcrypt.hash(process.env.TEST_PASSWORD, 10);

  await Usuario.create({
    nombre: 'Admin',
    apellido: 'Test',
    email: process.env.TEST_VEHICULOS_ADMIN_EMAIL,
    password: hashedPassword,
    rol_id: adminRole.id,
    activo: 1
  });

  await Usuario.create({
    nombre: 'Empleado',
    apellido: 'Test',
    email: process.env.TEST_VEHICULOS_EMPLEADO_EMAIL,
    password: hashedPassword,
    rol_id: empleadoRole.id,
    activo: 1
  });

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.TEST_VEHICULOS_ADMIN_EMAIL, password: process.env.TEST_VEHICULOS_ADMIN_PASSWORD });
  adminToken = adminRes.body.token;

  const empRes = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.TEST_VEHICULOS_EMPLEADO_EMAIL, password: process.env.TEST_VEHICULOS_EMPLEADO_PASSWORD });
  empleadoToken = empRes.body.token;

  const tipo = await TipoVehiculo.create({
    nombre: 'Sedan Test',
    descripcion: 'Tipo test'
  });
  tipoVehiculoId = tipo.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Vehiculos Endpoints', () => {
  let vehiculoId;

  test('POST /api/vehiculos - admin crea vehiculo', async () => {
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        placa: 'TEST-001',
        marca: 'Toyota',
        modelo: 'Corolla',
        ano: 2024,
        tipo_vehiculo_id: tipoVehiculoId,
        capacidad_combustible: 12.5,
        color: 'Blanco'
      });

    expect(res.status).toBe(201);
    expect(res.body.placa).toBe('TEST-001');
    vehiculoId = res.body.id;
  });

  test('POST /api/vehiculos - empleado puede crear', async () => {
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${empleadoToken}`)
      .send({
        placa: 'TEST-002',
        marca: 'Honda',
        modelo: 'Civic',
        ano: 2024,
        tipo_vehiculo_id: tipoVehiculoId,
        capacidad_combustible: 11.0,
        color: 'Gris'
      });

    expect(res.status).toBe(201);
    expect(res.body.placa).toBe('TEST-002');
  });

  test('GET /api/vehiculos - listar vehiculos', async () => {
    const res = await request(app)
      .get('/api/vehiculos')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/vehiculos/:id - obtener vehiculo', async () => {
    const res = await request(app)
      .get(`/api/vehiculos/${vehiculoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.placa).toBe('TEST-001');
  });

  test('PUT /api/vehiculos/:id - admin actualiza', async () => {
    const res = await request(app)
      .put(`/api/vehiculos/${vehiculoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        placa: 'TEST-001',
        marca: 'Toyota',
        modelo: 'Corolla 2024',
        ano: 2024,
        tipo_vehiculo_id: tipoVehiculoId,
        color: 'Negro'
      });

    expect(res.status).toBe(200);
    expect(res.body.modelo).toBe('Corolla 2024');
  });

  test('DELETE /api/vehiculos/:id - admin elimina (soft delete)', async () => {
    const res = await request(app)
      .delete(`/api/vehiculos/${vehiculoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
