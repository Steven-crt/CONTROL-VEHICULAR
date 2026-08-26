/* Semilla de datos DEMO para la BD LOCAL de pruebas (control_vehicular_test @3309).
 * Genera ~6 meses de historial realista: combustible, mantenimientos,
 * anomalías, asignaciones, ubicaciones GPS, notificaciones y proveedores.
 * También normaliza mantenimientos.estado al ENUM que usa la app
 * ('Pendiente','Completado','Rechazado').
 *
 * Uso:  node scripts/seed_demo_test.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const TEST = {
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: Number(process.env.TEST_DB_PORT || 3309),
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || '160507',
  database: process.env.TEST_DB_NAME || 'control_vehicular_test'
};

// PRNG determinista (mulberry32) para datos reproducibles
let _s = 42;
function rnd() {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

function diasAtras(d, hora = 9, min = 30) {
  const f = new Date();
  f.setDate(f.getDate() - d);
  f.setHours(hora, min, rint(0, 59), 0);
  return f;
}

const PROVEEDORES = [
  ['Taller Mecánico Central', '2222-1010', 'taller@central.com', 'Av. Revolución #145', 'Taller'],
  ['Lubricantes del Norte', '2231-8845', 'ventas@lubricantes.com', 'Carretera Norte Km 3', 'Taller'],
  ['Frenos Express', '2255-7788', 'info@frenosexpress.com', 'Zona Industrial B #22', 'Repuesto'],
  ['Llantas El Rodador', '2260-3344', 'rodador@llantas.com', ' Blvd. del Sur #500', 'Repuesto'],
  ['Gasolinera Puma Km 12', '2211-9090', '', 'Carretera a Comalapa Km 12', 'Gasolinera'],
  ['Servicios Hidráulicos SA', '2299-4567', 'servicio@hidraulicos.com', 'Col. Escalón #78', 'Otro']
];

const DESC_PREVENTIVO = [
  'Cambio de aceite y filtro de aceite',
  'Rotación de llantas y revisión de presión',
  'Alineación y balanceo completo',
  'Cambio de pastillas de freno delanteras',
  'Cambio de bujías y filtros (aire/combustible)',
  'Lavado de inyectores y limpieza de cuerpo de aceleración',
  'Cambio de correa de distribución',
  'Revisión general de 20,000 km'
];
const DESC_CORRECTIVO = [
  'Reparación de alternador (no carga batería)',
  'Cambio de bomba de agua por fuga de refrigerante',
  'Reparación de clutch (patinaba en subidas)',
  'Cambio de radiador por sobrecalentamiento',
  'Reparación de sistema eléctrico (corto en faros)',
  'Cambio de amortiguadores traseros',
  'Reparación de dirección hidráulica por fuga'
];

const TIPOS_ANOMALIA = ['Frenos', 'Motor', 'Llantas', 'Suspensión', 'Eléctrico', 'Fugas', 'Transmisión', 'Otro'];
const DESC_ANOMALIAS = {
  Frenos: 'Chirrido metálico al frenar en bajadas; posible desgaste de balatas.',
  Motor: 'Pérdida de potencia y humo azul al acelerar fuerte.',
  Llantas: 'Desgaste irregular en llanta delantera derecha.',
  Suspensión: 'Golpeteo seco en baches del lado trasero izquierdo.',
  'Eléctrico': 'Luces del tablero parpadean intermitentemente en marcha.',
  Fugas: 'Mancha de aceite bajo el motor después de estar estacionado.',
  'Transmisión': 'Tironeos al cambiar de 2da a 3ra en frío.',
  Otro: 'Ruido de zumbido constante que aumenta con la velocidad.'
};

async function main() {
  const conn = await mysql.createConnection(TEST);
  await conn.beginTransaction();
  try {
    // 0) Normalizar ENUM de estados de mantenimientos al vocabulario de la app
    await conn.query(
      "ALTER TABLE mantenimientos MODIFY COLUMN estado ENUM('Pendiente','Completado','Rechazado') NOT NULL DEFAULT 'Pendiente'"
    );

    // 1) Limpiar tablas transaccionales (orden FK-safe)
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['ubicaciones', 'asignaciones', 'anomalias', 'mantenimientos', 'solicitudes_combustible', 'notificaciones']) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query('DELETE FROM proveedores');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // 2) Proveedores
    for (const [nombre, tel, email, dir, tipo] of PROVEEDORES) {
      await conn.query(
        'INSERT INTO proveedores (nombre, telefono, email, direccion, tipo, activo, created_at) VALUES (?,?,?,?,?,1,NOW())',
        [nombre, tel, email, dir, tipo]
      );
    }

    // 3) Parámetros por vehículo (ids 1-4 ya existen clonados de producción)
    const [vehs] = await conn.query('SELECT id FROM vehiculos ORDER BY id LIMIT 4');
    const VEH_IDS = vehs.map(v => v.id);
    if (VEH_IDS.length < 2) throw new Error('Se requieren al menos 2 vehículos en la BD test');

    const KM_ACTUAL = { };
    const RATE = { };   // km por día
    for (const id of VEH_IDS) { KM_ACTUAL[id] = rint(42000, 230000); RATE[id] = 55 + rnd() * 55; }
    const kmEn = (vid, diasAtras) => Math.max(1000, Math.round(KM_ACTUAL[vid] - diasAtras * RATE[vid]));

    // 4) Combustible: 9 surtidas por vehículo (~6 meses) + 3 pendientes + 2 rechazadas
    let nCom = 0;
    const DIAS_CARGAS = [[168, 149, 133, 116, 97, 83, 63, 44, 18], [162, 141, 128, 109, 91, 76, 58, 37, 15], [171, 155, 137, 121, 103, 87, 66, 47, 21], [159, 138, 124, 105, 89, 73, 55, 34, 12]];
    for (const vid of VEH_IDS) {
      for (const d0 of DIAS_CARGAS[(vid - 1) % DIAS_CARGAS.length]) {
        const d = Math.max(1, d0 + rint(-3, 3));
        const gal = round1(8 + rnd() * 6);
        const precio = round2(1.32 + ((180 - d) % 60) / 200 + rnd() * 0.04); // varía por mes 1.32-1.48
        await conn.query(
          `INSERT INTO solicitudes_combustible
           (codigo, vehiculo_id, solicitante_id, galones_solicitados, galones_surtidos, tipo_combustible,
            costo_total, precio_por_galon, kilometraje_actual, estado, atendido_por_id, fecha_solicitud, fecha_atencion, observaciones)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [`COM-DEMO${String(++nCom).padStart(5, '0')}`, vid, pick([2, 4]), gal, gal, pick(['Gasolina Superior', 'Gasolina Regular', 'Diésel']),
            round2(gal * precio), precio, kmEn(vid, d), 'Surtida', pick([1, 3]),
            diasAtras(d, rint(7, 17)), diasAtras(d, rint(7, 17), rint(35, 70)), '']
        );
      }
    }
    // Pendientes recientes (creadas por empleados)
    const PENDS = [[VEH_IDS[0], 0, 11], [VEH_IDS[1], 1, 14], [VEH_IDS[2], 2, 9]];
    for (const [vid, d, gal] of PENDS) {
      await conn.query(
        `INSERT INTO solicitudes_combustible
         (codigo, vehiculo_id, solicitante_id, galones_solicitados, tipo_combustible, costo_total,
          kilometraje_actual, estado, fecha_solicitud, observaciones)
         VALUES (?,?,?,?,?,?,?,'Pendiente',?,?)`,
        [`COM-DEMO${String(++nCom).padStart(5, '0')}`, vid, 4, gal, 'Gasolina Superior', 0,
          kmEn(vid, d), diasAtras(d, rint(8, 16)), '']
      );
    }
    // Rechazadas
    const RECHS = [[VEH_IDS[3], 5, 'Fuera de política: tanque casi lleno'], [VEH_IDS[0], 8, 'Sin justificación de ruta']];
    for (const [vid, d, motivo] of RECHS) {
      await conn.query(
        `INSERT INTO solicitudes_combustible
         (codigo, vehiculo_id, solicitante_id, galones_solicitados, tipo_combustible, costo_total,
          kilometraje_actual, estado, atendido_por_id, fecha_solicitud, fecha_atencion, observaciones)
         VALUES (?,?,?,?,?,?,?,'Rechazada',?,?,?,?)`,
        [`COM-DEMO${String(++nCom).padStart(5, '0')}`, vid, 2, 12, 'Gasolina Regular', 0,
          kmEn(vid, d), 1, diasAtras(d, 10), diasAtras(d, 10, 50), motivo]
      );
    }

    // 5) Tipos de mantenimiento disponibles
    const [tipos] = await conn.query('SELECT id FROM tipos_mantenimiento ORDER BY id');
    const TIPO_IDS = tipos.length ? tipos.map(t => t.id) : [null];

    // 6) Mantenimientos: 18 completados + 2 pendientes + 1 rechazado
    let nMt = 0;
    const DIAS_MT = [[165, 118, 74, 33], [152, 106, 61, 26], [173, 127, 82, 40, 14], [146, 99, 57, 23]];
    for (const vid of VEH_IDS) {
      for (const d0 of DIAS_MT[(vid - 1) % DIAS_MT.length]) {
        const d = Math.max(2, d0 + rint(-4, 4));
        const correctivo = rnd() < 0.38;
        const prov = correctivo ? 'Taller Mecánico Central' : PROVEEDORES[rint(0, 3)][0];
        await conn.query(
          `INSERT INTO mantenimientos
           (codigo, vehiculo_id, solicitante_id, tipo_mantenimiento_id, tipo_servicio, descripcion,
            kilometraje_realizado, fecha_programada, fecha_realizada, costo, proveedor, factura, estado, observaciones, atendido_por_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [`MT-DEMO${String(++nMt).padStart(5, '0')}`, vid, pick([1, 3]), pick(TIPO_IDS),
            correctivo ? 'Correctivo' : 'Preventivo',
            correctivo ? pick(DESC_CORRECTIVO) : pick(DESC_PREVENTIVO),
            kmEn(vid, d), diasAtras(d - 2), diasAtras(d, rint(8, 15)),
            round2(correctivo ? 120 + rnd() * 360 : 45 + rnd() * 130),
            prov, `FAC-2026-${rint(1000, 9999)}`, 'Completado', '', pick([1, 3])]
        );
      }
    }
    const MTPEND = [[VEH_IDS[1], 2, 'Solicitud de servicio de frenos (pedaleo esponjoso)'], [VEH_IDS[3], 1, 'Revisión por vibración a partir de 80 km/h']];
    for (const [vid, d, desc] of MTPEND) {
      await conn.query(
        `INSERT INTO mantenimientos
         (codigo, vehiculo_id, solicitante_id, tipo_mantenimiento_id, tipo_servicio, descripcion,
          kilometraje_realizado, fecha_realizada, costo, estado)
         VALUES (?,?,?,?,?,?,?,?,0,'Pendiente')`,
        [`MT-DEMO${String(++nMt).padStart(5, '0')}`, vid, pick([2, 4]), pick(TIPO_IDS), 'Preventivo', desc, kmEn(vid, d), diasAtras(d, rint(8, 14))]
      );
    }
    await conn.query(
      `INSERT INTO mantenimientos
       (codigo, vehiculo_id, solicitante_id, tipo_mantenimiento_id, tipo_servicio, descripcion,
        kilometraje_realizado, fecha_realizada, costo, estado, atendido_por_id)
       VALUES ('MT-DEMO99999', ?, 2, ?, 'Preventivo', 'Solicitud de cambio de llantas', ?, ?, 0, 'Rechazado', 1)`,
      [VEH_IDS[2], pick(TIPO_IDS), kmEn(VEH_IDS[2], 6), diasAtras(6, 11)]
    );

    // 7) Anomalías: 3 Pendiente / 5 Resuelta / 2 Descartada
    const ANO_PLAN = [
      ['Pendiente', 'alta'], ['Resuelta', 'media'], ['Resuelta', 'baja'],
      ['Pendiente', 'media'], ['Descartada', 'baja'], ['Resuelta', 'alta'],
      ['Resuelta', 'media'], ['Pendiente', 'baja'], ['Resuelta', 'alta'], ['Descartada', 'media']
    ];
    let nAno = 0;
    for (const [estado, sev] of ANO_PLAN) {
      const vid = pick(VEH_IDS);
      const tipo = pick(TIPOS_ANOMALIA);
      const d = rint(2, 55);
      const resuelta = estado === 'Resuelta' || estado === 'Descartada';
      await conn.query(
        `INSERT INTO anomalias
         (codigo, vehiculo_id, usuario_id, tipo, severidad, descripcion, foto_url, estado, fecha_resuelta, resuelta_por_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [`ANO-DEMO${String(++nAno).padStart(4, '0')}`, vid, pick([2, 4]), tipo, sev,
          DESC_ANOMALIAS[tipo], null, estado,
          resuelta ? diasAtras(d - 1, rint(10, 16)) : null,
          resuelta ? pick([1, 3]) : null,
          diasAtras(d, rint(8, 18))]
      );
    }

    // 8) Asignaciones vehículo-usuario
    await conn.query(
      `INSERT INTO asignaciones (usuario_id, vehiculo_id, created_at) VALUES
        (2, ?, NOW() - INTERVAL 150 DAY),
        (2, ?, NOW() - INTERVAL 90 DAY),
        (4, ?, NOW() - INTERVAL 140 DAY),
        (4, ?, NOW() - INTERVAL 60 DAY)`,
      [VEH_IDS[0], VEH_IDS[1], VEH_IDS[1], VEH_IDS[2]]
    );

    // 9) Ubicaciones GPS recientes (~últimas 30 h)
    for (const vid of VEH_IDS) {
      let lat = 13.6929, lng = -89.2182;
      for (let i = 0; i < 6; i++) {
        lat += (rnd() - 0.45) * 0.012;
        lng += (rnd() - 0.5) * 0.012;
        await conn.query(
          `INSERT INTO ubicaciones (vehiculo_id, usuario_id, latitud, longitud, velocidad, direccion, precision_gps, bateria, timestamp)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [vid, pick([2, 4]), Number(lat.toFixed(7)), Number(lng.toFixed(7)),
            rnd() < 0.25 ? 0 : round1(rnd() * 80), rint(0, 359), round1(5 + rnd() * 9), round1(40 + rnd() * 58),
            new Date(Date.now() - (i * 5 + rint(0, 3)) * 3600000)]
        );
      }
    }

    // 10) Notificaciones para los admins sobre solicitudes pendientes
    for (const uid of [1, 3]) {
      await conn.query(
        `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, leida, created_at) VALUES
         (?, 'Nuevas solicitudes pendientes', 'Hay 3 cargas de combustible y 2 servicios de mantenimiento esperando aprobación.', 'warning', 0, NOW() - INTERVAL 2 HOUR),
         (?, 'Anomalía de severidad alta reportada', 'Se reportó una anomalía crítica en uno de los vehículos asignados.', 'danger', 0, NOW() - INTERVAL 5 HOUR),
         (?, 'Bienvenido al sistema', 'Sesión de pruebas con datos demo generados automáticamente.', 'info', 1, NOW() - INTERVAL 7 DAY)`,
        [uid, uid, uid]
      );
    }

    await conn.commit();

    // Resumen
    const resumen = {};
    for (const t of ['proveedores', 'solicitudes_combustible', 'mantenimientos', 'anomalias', 'asignaciones', 'ubicaciones', 'notificaciones']) {
      const [[r]] = await conn.query(`SELECT COUNT(*) c FROM ${t}`);
      resumen[t] = r.c;
    }
    console.log('SEED OK:', JSON.stringify(resumen));
    await conn.end();
  } catch (e) {
    await conn.rollback();
    console.error('SEED ERROR:', e.message);
    await conn.end();
    process.exit(1);
  }
}

main();
