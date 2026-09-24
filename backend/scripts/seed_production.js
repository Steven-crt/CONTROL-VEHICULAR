/* Semilla de datos DEMO para la BD de PRODUCCION (Aiven - defaultdb).
 * Genera ~6 meses de historial realista: combustible, mantenimientos,
 * anomalías, asignaciones, ubicaciones GPS, notificaciones y proveedores.
 *
 * Adapta seed_demo_test.js para los 3 vehículos activos (ids 1-3)
 * y 2 usuarios existentes (admin=1, empleado=2).
 *
 * Uso:  node scripts/seed_production.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const PROD = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
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
  const conn = await mysql.createConnection(PROD);
  await conn.beginTransaction();
  try {
    // 0) Normalizar ENUM de estados de mantenimientos
    await conn.query(
      "ALTER TABLE mantenimientos MODIFY COLUMN estado ENUM('Pendiente','Completado','Rechazado') NOT NULL DEFAULT 'Pendiente'"
    ).catch(() => {});

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

    // 3) Vehículos activos (solo ids 1, 2, 3)
    const VEH_IDS = [1, 2, 3];

    const KM_ACTUAL = { };
    const RATE = { };
    for (const id of VEH_IDS) { KM_ACTUAL[id] = rint(42000, 230000); RATE[id] = 55 + rnd() * 55; }
    const kmEn = (vid, dias) => Math.max(1000, Math.round(KM_ACTUAL[vid] - dias * RATE[vid]));

    // Actualizar kilometraje_actual de cada vehículo al valor más alto que le tocaría
    for (const vid of VEH_IDS) {
      await conn.query('UPDATE vehiculos SET kilometraje_actual = ? WHERE id = ?', [KM_ACTUAL[vid], vid]);
    }

    // 4) Combustible: 9 surtidas por vehículo (~6 meses) + 3 pendientes + 2 rechazadas
    let nCom = 0;
    const DIAS_CARGAS = [[168, 149, 133, 116, 97, 83, 63, 44, 18], [162, 141, 128, 109, 91, 76, 58, 37, 15], [171, 155, 137, 121, 103, 87, 66, 47, 21]];
    for (const vid of VEH_IDS) {
      for (const d0 of DIAS_CARGAS[(vid - 1) % DIAS_CARGAS.length]) {
        const d = Math.max(1, d0 + rint(-3, 3));
        const gal = round1(8 + rnd() * 6);
        const precio = round2(1.32 + ((180 - d) % 60) / 200 + rnd() * 0.04);
        await conn.query(
          `INSERT INTO solicitudes_combustible
          (codigo, vehiculo_id, solicitante_id, galones_solicitados, galones_surtidos, tipo_combustible,
            costo_total, precio_por_galon, kilometraje_actual, estado, atendido_por_id, fecha_solicitud, fecha_atencion, observaciones)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [`COM-PROD${String(++nCom).padStart(5, '0')}`, vid, 2, gal, gal, pick(['Gasolina Superior', 'Gasolina Regular', 'Diésel']),
            round2(gal * precio), precio, kmEn(vid, d), 'Surtida', 1,
            diasAtras(d, rint(7, 17)), diasAtras(d, rint(7, 17), rint(35, 70)), '']
        );
      }
    }
    // Pendientes recientes
    const PENDS = [[VEH_IDS[0], 0, 11], [VEH_IDS[1], 1, 14], [VEH_IDS[2], 2, 9]];
    for (const [vid, d, gal] of PENDS) {
      await conn.query(
        `INSERT INTO solicitudes_combustible
        (codigo, vehiculo_id, solicitante_id, galones_solicitados, tipo_combustible, costo_total,
          kilometraje_actual, estado, fecha_solicitud, observaciones)
        VALUES (?,?,?,?,?,?,?,'Pendiente',?,?)`,
        [`COM-PROD${String(++nCom).padStart(5, '0')}`, vid, 2, gal, 'Gasolina Superior', 0,
          kmEn(vid, d), diasAtras(d, rint(8, 16)), '']
      );
    }
    // Rechazadas
    const RECHS = [[VEH_IDS[0], 5, 'Fuera de política: tanque casi lleno'], [VEH_IDS[1], 8, 'Sin justificación de ruta']];
    for (const [vid, d, motivo] of RECHS) {
      await conn.query(
        `INSERT INTO solicitudes_combustible
        (codigo, vehiculo_id, solicitante_id, galones_solicitados, tipo_combustible, costo_total,
          kilometraje_actual, estado, atendido_por_id, fecha_solicitud, fecha_atencion, observaciones)
        VALUES (?,?,?,?,?,?,?,'Rechazada',?,?,?,?)`,
        [`COM-PROD${String(++nCom).padStart(5, '0')}`, vid, 2, 12, 'Gasolina Regular', 0,
          kmEn(vid, d), 1, diasAtras(d, 10), diasAtras(d, 10, 50), motivo]
      );
    }

    // 5) Tipos de mantenimiento disponibles
    const [tipos] = await conn.query('SELECT id FROM tipos_mantenimiento ORDER BY id');
    const TIPO_IDS = tipos.length ? tipos.map(t => t.id) : [null];

    // 6) Mantenimientos: 15 completados + 2 pendientes + 1 rechazado
    let nMt = 0;
    const DIAS_MT = [[165, 118, 74, 33], [152, 106, 61, 26], [173, 127, 82, 40]];
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
          [`MT-PROD${String(++nMt).padStart(5, '0')}`, vid, 2, pick(TIPO_IDS),
            correctivo ? 'Correctivo' : 'Preventivo',
            correctivo ? pick(DESC_CORRECTIVO) : pick(DESC_PREVENTIVO),
            kmEn(vid, d), diasAtras(d - 2), diasAtras(d, rint(8, 15)),
            round2(correctivo ? 120 + rnd() * 360 : 45 + rnd() * 130),
            prov, `FAC-2026-${rint(1000, 9999)}`, 'Completado', '', 1]
        );
      }
    }
    const MTPEND = [[VEH_IDS[1], 2, 'Solicitud de servicio de frenos (pedaleo esponjoso)'], [VEH_IDS[2], 1, 'Revisión por vibración a partir de 80 km/h']];
    for (const [vid, d, desc] of MTPEND) {
      await conn.query(
        `INSERT INTO mantenimientos
          (codigo, vehiculo_id, solicitante_id, tipo_mantenimiento_id, tipo_servicio, descripcion,
          kilometraje_realizado, fecha_realizada, costo, estado)
        VALUES (?,?,?,?,?,?,?,?,0,'Pendiente')`,
        [`MT-PROD${String(++nMt).padStart(5, '0')}`, vid, 2, pick(TIPO_IDS), 'Preventivo', desc, kmEn(vid, d), diasAtras(d, rint(8, 14))]
      );
    }
    await conn.query(
      `INSERT INTO mantenimientos
      (codigo, vehiculo_id, solicitante_id, tipo_mantenimiento_id, tipo_servicio, descripcion,
        kilometraje_realizado, fecha_realizada, costo, estado, atendido_por_id)
      VALUES ('MT-PROD99999', ?, 2, ?, 'Preventivo', 'Solicitud de cambio de llantas', ?, ?, 0, 'Rechazado', 1)`,
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
        [`ANO-PROD${String(++nAno).padStart(4, '0')}`, vid, 2, tipo, sev,
          DESC_ANOMALIAS[tipo], null, estado,
          resuelta ? diasAtras(d - 1, rint(10, 16)) : null,
          resuelta ? 1 : null,
          diasAtras(d, rint(8, 18))]
      );
    }

    // 8) Asignaciones vehículo-usuario (sin duplicar usuario+vehiculo)
    await conn.query(
      `INSERT INTO asignaciones (usuario_id, vehiculo_id, created_at) VALUES
        (1, ?, NOW() - INTERVAL 160 DAY),
        (2, ?, NOW() - INTERVAL 150 DAY),
        (2, ?, NOW() - INTERVAL 90 DAY),
        (2, ?, NOW() - INTERVAL 60 DAY)`,
      [VEH_IDS[0], VEH_IDS[0], VEH_IDS[1], VEH_IDS[2]]
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
          [vid, 2, Number(lat.toFixed(7)), Number(lng.toFixed(7)),
            rnd() < 0.25 ? 0 : round1(rnd() * 80), rint(0, 359), round1(5 + rnd() * 9), round1(40 + rnd() * 58),
            new Date(Date.now() - (i * 5 + rint(0, 3)) * 3600000)]
        );
      }
    }

    // 10) Notificaciones para el admin sobre solicitudes pendientes
    await conn.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, leida, created_at) VALUES
      (1, 'Nuevas solicitudes pendientes', 'Hay 3 cargas de combustible y 2 servicios de mantenimiento esperando aprobación.', 'warning', 0, NOW() - INTERVAL 2 HOUR),
      (1, 'Anomalía de severidad alta reportada', 'Se reportó una anomalía crítica en uno de los vehículos asignados.', 'danger', 0, NOW() - INTERVAL 5 HOUR),
      (1, 'Bienvenido al sistema', 'Datos demo de producción generados automáticamente.', 'info', 1, NOW() - INTERVAL 7 DAY)`
    );

    await conn.commit();

    // Resumen
    const resumen = {};
    for (const t of ['proveedores', 'solicitudes_combustible', 'mantenimientos', 'anomalias', 'asignaciones', 'ubicaciones', 'notificaciones']) {
      const [[r]] = await conn.query(`SELECT COUNT(*) c FROM ${t}`);
      resumen[t] = r.c;
    }
    console.log('SEED PRODUCCIÓN OK:', JSON.stringify(resumen, null, 2));
    await conn.end();
  } catch (e) {
    await conn.rollback();
    console.error('SEED PRODUCCIÓN ERROR:', e.message);
    await conn.end();
    process.exit(1);
  }
}

main();
