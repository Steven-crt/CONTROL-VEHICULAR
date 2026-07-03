const request = require('supertest');
const app = require('../src/app');
const { sequelize, Rol, Usuario, TipoVehiculo, Vehiculo, Asignacion } = require('../src/models');
const bcrypt = require('bcryptjs');

let adminToken;
let empleadoToken;
let vehiculoId;
let empleadoId;

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
    permisos: { vehiculos: 'read', solicitudes: 'create_read_own' }
  });

  const adminRole = await Rol.findOne({ where: { nombre: 'Administrador' } });
  const empleadoRole = await Rol.findOne({ where: { nombre: 'Empleado' } });

  const hashedPassword = await bcrypt.hash(process.env.TEST_PASSWORD, 10);

  const admin = await Usuario.create({
    nombre: 'Admin',
    apellido: 'Combustible',
    email: process.env.TEST_SOLICITUDES_ADMIN_EMAIL,
    password: hashedPassword,
    rol_id: adminRole.id,
    activo: 1
  });

  const empleado = await Usuario.create({
    nombre: 'Empleado',
    apellido: 'Combustible',
    email: process.env.TEST_SOLICITUDES_EMPLEADO_EMAIL,
    password: hashedPassword,
    rol_id: empleadoRole.id,
    activo: 1
  });
  empleadoId = empleado.id;

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.TEST_SOLICITUDES_ADMIN_EMAIL, password: process.env.TEST_SOLICITUDES_ADMIN_PASSWORD });
  adminToken = adminRes.body.token;

  const empRes = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.TEST_SOLICITUDES_EMPLEADO_EMAIL, password: process.env.TEST_SOLICITUDES_EMPLEADO_PASSWORD });
  empleadoToken = empRes.body.token;

  const tipo = await TipoVehiculo.create({ nombre: 'Sedan Comb', descripcion: 'Test' });

  const vehiculo = await Vehiculo.create({
    placa: 'COMB-001',
    marca: 'Toyota',
    modelo: 'Hilux',
    ano: 2024,
    tipo_vehiculo_id: tipo.id,
    capacidad_combustible: 15,
    estado: 'Activo'
  });
  vehiculoId = vehiculo.id;

  await Asignacion.create({
    usuario_id: empleadoId,
    vehiculo_id: vehiculoId
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Solicitudes Combustible Endpoints', () => {
  let solicitudId;

  test('POST /api/solicitudes-combustible - empleado crea solicitud', async () => {
    const res = await request(app)
      .post('/api/solicitudes-combustible')
      .set('Authorization', `Bearer ${empleadoToken}`)
      .send({
        vehiculo_id: vehiculoId,
        galones_solicitados: 10,
        observaciones: 'Solicitud de prueba'
      });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('Pendiente');
    expect(res.body.codigo).toMatch(/^SC-/);
    solicitudId = res.body.id;
  });

  test('GET /api/solicitudes-combustible - empleado ve sus solicitudes', async () => {
    const res = await request(app)
      .get('/api/solicitudes-combustible')
      .set('Authorization', `Bearer ${empleadoToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/solicitudes-combustible/:id - obtener solicitud', async () => {
    const res = await request(app)
      .get(`/api/solicitudes-combustible/${solicitudId}`)
      .set('Authorization', `Bearer ${empleadoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.codigo).toMatch(/^SC-/);
  });

  test('PATCH /api/solicitudes-combustible/:id/estado - admin aprueba', async () => {
    const res = await request(app)
      .patch(`/api/solicitudes-combustible/${solicitudId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        estado: 'Aprobada',
        galones_surtidos: 10,
        precio_por_galon: 25.50
      });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('Aprobada');
  });

  test('PATCH /api/solicitudes-combustible/:id/estado - empleado no puede cambiar estado', async () => {
    const res = await request(app)
      .patch(`/api/solicitudes-combustible/${solicitudId}/estado`)
      .set('Authorization', `Bearer ${empleadoToken}`)
      .send({ estado: 'Rechazada' });

    expect(res.status).toBe(403);
  });
});
