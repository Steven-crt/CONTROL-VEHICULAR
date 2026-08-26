const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', password: '160507', database: 'control_vehicular_test' });
  const [rows] = await c.query(
    `SELECT COUNT(*) as total,
            SUM(a.estado = 'Pendiente') as abiertas,
            SUM(a.estado IN ('Resuelta','Descartada')) as cerradas,
            SUM(a.severidad = 'alta' AND a.estado = 'Pendiente') as criticas_abiertas
     FROM anomalias a WHERE 1=1 AND a.created_at >= ? AND a.created_at <= ?`,
    ['2026-01-01', '2026-12-31 23:59:59']
  );
  console.log('ROWS:', JSON.stringify(rows));
  console.log('typeof total:', typeof rows[0]?.total, '| valor:', rows[0]?.total);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
