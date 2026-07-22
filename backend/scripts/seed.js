const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TIPOS = ['auto', 'moto', 'VIP', 'discapacitado'];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'parqueo_db',
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('🌱 Iniciando poblado de datos de prueba...');
    
    // 1. USUARIOS (10 registros)
    console.log('Trunking/Insertando Usuarios...');
    await connection.query("DELETE FROM usuarios WHERE username != 'admin'");
    const hash = await bcrypt.hash('password123', 8);
    for(let i=1; i<=10; i++) {
        const rol = i <= 2 ? 'admin' : (i <= 6 ? 'operador' : 'cajero');
        await connection.query(
            "INSERT INTO usuarios (nombre, username, email, password, rol, activo) VALUES (?, ?, ?, ?, ?, 1)",
            [`Usuario Prueba ${i}`, `usuario${i}`, `user${i}@test.com`, hash, rol]
        );
    }

    // 2. TARIFAS (Agregar hasta tener 10)
    console.log('Insertando Tarifas...');
    await connection.query("DELETE FROM tarifas WHERE id > 4"); // 1-4 are defaults
    const mods = ['mensual', 'dia', 'fraccion'];
    for(let i=5; i<=10; i++) {
        await connection.query(
            "INSERT INTO tarifas (tipo_vehiculo, modalidad, precio, tiempo_gracia, descripcion, activo) VALUES (?, ?, ?, 10, 'Tarifa extra', 1)",
            [TIPOS[i%4], mods[i%3], (Math.random()*10 + 1).toFixed(2)] // 1.00 - 11.00
        );
    }

    // 3. CLIENTES ABONADOS (10 registros)
    console.log('Insertando Clientes...');
    await connection.query("DELETE FROM clientes");
    for(let i=1; i<=10; i++) {
        const f_inicio = new Date();
        f_inicio.setDate(f_inicio.getDate() - Math.floor(Math.random()*10));
        const f_fin = new Date(f_inicio);
        f_fin.setMonth(f_fin.getMonth() + 1);
        
        await connection.query(
            "INSERT INTO clientes (cedula, nombre, email, telefono, placa, tipo_membresia, fecha_inicio, fecha_vencimiento, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
            [`09${Math.floor(Math.random()*100000000)}`, `Cliente Premium ${i}`, `cliente${i}@mail.com`, `099${Math.floor(Math.random()*1000000)}`, `ABC-10${i%10}`, 'mensual', f_inicio, f_fin]
        );
    }

    // 4. TICKETS & PAGOS (Data Histórica y Actual)
    console.log('Limpiando tickets y pagos...');
    await connection.query("DELETE FROM pagos");
    await connection.query("DELETE FROM cierres_caja");
    await connection.query("DELETE FROM tickets");
    await connection.query("UPDATE espacios SET estado = 'libre'");
    
    console.log('Generando tickets históricos y activos...');
    let ticketId = 1;
    // Data para los ultimos 7 días
    for(let i=7; i>=0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        let esHoy = i === 0;
        let entradasDelDia = esHoy ? 10 : Math.floor(Math.random() * 15) + 5; // 5 a 20 entradas por dia pasado, 10 hoy
        
        for(let j=1; j<=entradasDelDia; j++) {
            // Hora aleatoria durante el dia (entre 8 AM y 8 PM)
            const horaEntrada = new Date(date);
            horaEntrada.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
            
            const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
            const placa = `${String.fromCharCode(65+j,66+j,67+j)}-0${i}${j}`;
            // Buscar espacio libre de ese tipo
            const [esp] = await connection.query("SELECT id FROM espacios WHERE tipo = ? AND estado = 'libre' LIMIT 1", [tipo]);
            let espacio_id = esp.length ? esp[0].id : null;
            if(!espacio_id) continue;
            
            // Si es hoy y los ultimos 6 registros, los dejamos como "activos"
            if (esHoy && j > 4) {
                await connection.query(
                    "INSERT INTO tickets (id, codigo, placa, tipo_vehiculo, espacio_id, hora_entrada, estado) VALUES (?, ?, ?, ?, ?, ?, 'activo')",
                    [ticketId, `T-${ticketId.toString().padStart(5,'0')}`, placa, tipo, espacio_id, horaEntrada]
                );
                // Ocupar el espacio
                await connection.query("UPDATE espacios SET estado = 'ocupado' WHERE id = ?", [espacio_id]);
                ticketId++;
            } else {
                // Fueron completados (Pagados)
                const horaSalida = new Date(horaEntrada);
                horaSalida.setHours(horaEntrada.getHours() + Math.floor(Math.random() * 3) + 1); // 1 a 3 hr
                
                await connection.query(
                    "INSERT INTO tickets (id, codigo, placa, tipo_vehiculo, espacio_id, hora_entrada, hora_salida, estado) VALUES (?, ?, ?, ?, ?, ?, ?, 'cerrado')",
                    [ticketId, `T-${ticketId.toString().padStart(5,'0')}`, placa, tipo, espacio_id, horaEntrada, horaSalida]
                );
                
                // Generar pago
                const monto = ((Math.random() * 3) + 1).toFixed(2);
                const metodo = ['efectivo', 'tarjeta', 'qr'][Math.floor(Math.random()*3)];
                await connection.query(
                    "INSERT INTO pagos (ticket_id, metodo_pago, monto, fecha_pago, usuario_id) VALUES (?, ?, ?, ?, 1)",
                    [ticketId, metodo, monto, horaSalida]
                );
                ticketId++;
            }
        }
    }
    
    // 5. CIERRES DE CAJA (1 por día de los últimos 7 días)
    for(let i=7; i>0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(23, 59, 59);
        await connection.query(
            "INSERT INTO cierres_caja (usuario_id, fecha_inicio, fecha_cierre, total_efectivo, total_tarjeta, total_qr, total_general, total_vehiculos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [1, date, date, (Math.random()*20).toFixed(2), (Math.random()*20).toFixed(2), (Math.random()*10).toFixed(2), (Math.random()*50 + 20).toFixed(2), Math.floor(Math.random()*15+5)]
        );
    }

    console.log('✅ Poblado exitoso. 10 registros por módulo insertados, data histórica para últimos 7 días generada.');

  } catch (err) {
    console.error('❌ Error poblado datos:', err);
  } finally {
    await connection.end();
    process.exit();
  }
}
seed();
