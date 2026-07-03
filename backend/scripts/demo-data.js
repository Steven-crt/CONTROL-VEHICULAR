const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const {
  sequelize, Rol, Usuario, TipoVehiculo, TipoMantenimiento,
  Vehiculo, Asignacion, Mantenimiento, SolicitudCombustible, Proveedor
} = require('../src/models');

async function crearVehiculos(tipos) {
  const vehiculos = await Vehiculo.bulkCreate([
    {
      placa: 'ABC-1234', marca: 'Toyota', modelo: 'Hilux', ano: 2021,
      tipo_vehiculo_id: tipos['Camioneta'], capacidad_combustible: 80,
      color: 'Blanco', kilometraje_actual: 45230, estado: 'Activo'
    },
    {
      placa: 'XYZ-5678', marca: 'Nissan', modelo: 'Frontier', ano: 2020,
      tipo_vehiculo_id: tipos['Camioneta'], capacidad_combustible: 75,
      color: 'Gris', kilometraje_actual: 62100, estado: 'Activo'
    },
    {
      placa: 'DEF-9012', marca: 'Toyota', modelo: 'Corolla', ano: 2022,
      tipo_vehiculo_id: tipos['Sedan'], capacidad_combustible: 50,
      color: 'Negro', kilometraje_actual: 18500, estado: 'Activo'
    },
    {
      placa: 'GHI-3456', marca: 'Honda', modelo: 'CR-V', ano: 2021,
      tipo_vehiculo_id: tipos['SUV'], capacidad_combustible: 57,
      color: 'Azul', kilometraje_actual: 31800, estado: 'Activo'
    },
    {
      placa: 'JKL-7890', marca: 'Ford', modelo: 'F-350', ano: 2019,
      tipo_vehiculo_id: tipos['Camion'], capacidad_combustible: 120,
      color: 'Rojo', kilometraje_actual: 98400, estado: 'En Mantenimiento'
    },
    {
      placa: 'MNO-2345', marca: 'Toyota', modelo: 'HiAce', ano: 2020,
      tipo_vehiculo_id: tipos['Van'], capacidad_combustible: 70,
      color: 'Blanco', kilometraje_actual: 54700, estado: 'Activo'
    },
    {
      placa: 'PQR-6789', marca: 'Hyundai', modelo: 'Tucson', ano: 2023,
      tipo_vehiculo_id: tipos['SUV'], capacidad_combustible: 54,
      color: 'Plata', kilometraje_actual: 8200, estado: 'Activo'
    },
    {
      placa: 'STU-0123', marca: 'Chevrolet', modelo: 'Silverado', ano: 2020,
      tipo_vehiculo_id: tipos['Camioneta'], capacidad_combustible: 98,
      color: 'Negro', kilometraje_actual: 71300, estado: 'Inactivo'
    },
  ], { ignoreDuplicates: true, individualHooks: true });
  console.log('✓ Vehículos creados:', vehiculos.length);
  return vehiculos;
}

async function crearProveedores() {
  await Proveedor.bulkCreate([
    {
      nombre: 'Taller Mecánico El Rápido', telefono: '2222-1111',
      email: 'elrapido@taller.com', direccion: '5a Avenida 10-20 Zona 1',
      tipo: 'Taller', observaciones: 'Especialistas en Toyota y Nissan'
    },
    {
      nombre: 'Gasolinera Central', telefono: '2333-4444',
      email: 'central@gasolinera.com', direccion: 'Blvd. Principal Km 5',
      tipo: 'Gasolinera', observaciones: 'Precio preferencial para flotas'
    },
    {
      nombre: 'Repuestos Auto Express', telefono: '2444-5555',
      email: 'ventas@autoexpress.com', direccion: '12 Calle 3-45 Zona 9',
      tipo: 'Repuesto', observaciones: 'Repuestos originales y alternos'
    },
    {
      nombre: 'Taller Diesel Profesional', telefono: '2555-6666',
      email: 'diesel@profesional.com', direccion: 'Calzada Roosevelt 22-10',
      tipo: 'Taller', observaciones: 'Especialistas en camiones y diésel'
    },
    {
      nombre: 'Gasolinera Norte', telefono: '2666-7777',
      email: 'norte@gasolinera.com', direccion: 'Anillo Periférico Norte Km 12',
      tipo: 'Gasolinera'
    },
  ], { ignoreDuplicates: true, individualHooks: true });
  console.log('✓ Proveedores creados');
}

module.exports = { crearVehiculos, crearProveedores };
