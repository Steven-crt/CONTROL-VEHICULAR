const BASE = 'http://localhost:3011/api';
(async () => {
  const login = async (u, p) => (await (await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) })).json());
  const emp = await login('test_empleado', 'test1234');
  const adm = await login('test_admin', 'test1234');
  console.log('empleado rol:', emp.usuario?.rol, '| admin rol:', adm.usuario?.rol);
  const hE = { Authorization: 'Bearer ' + emp.token, 'Content-Type': 'application/json' };
  const hA = { Authorization: 'Bearer ' + adm.token, 'Content-Type': 'application/json' };

  // 1) Empleado crea pedido de combustible
  const post = await fetch(BASE + '/combustible', { method: 'POST', headers: hE, body: JSON.stringify({ vehiculo_id: 1, litros: 10, km_actual: 50000, tipo_combustible: 'Gasolina', observaciones: 'prueba pedidos' }) });
  const pj = await post.json();
  console.log('POST combustible:', post.status, JSON.stringify(pj));

  // 2) Empleado ve sus pendientes
  let r = await fetch(BASE + '/combustible?solo_mios=1&estado=Pendiente', { headers: hE });
  let j = await r.json();
  console.log('GET empleado pendientes:', r.status, Array.isArray(j) ? j.length : j);

  // 3) Admin ve pendientes globales
  r = await fetch(BASE + '/combustible?estado=Pendiente', { headers: hA });
  j = await r.json();
  console.log('GET admin pendientes:', r.status, Array.isArray(j) ? j.length : j, '| primer:', j[0]?.codigo, j[0]?.placa ?? '(sin placa?)');

  // 4) Mantenimiento igual
  const pm = await fetch(BASE + '/mantenimiento', { method: 'POST', headers: hE, body: JSON.stringify({ vehiculo_id: 1, km_actual: 50000, descripcion: 'cambio aceite prueba' }) });
  console.log('POST mantenimiento:', pm.status, JSON.stringify(await pm.json()).slice(0, 120));
  r = await fetch(BASE + '/mantenimiento?estado=Pendiente', { headers: hA });
  j = await r.json();
  console.log('GET admin mant pendientes:', r.status, Array.isArray(j) ? j.length : j);

  // 5) Notificación del admin debe incluir alerta pend:*
  r = await fetch(BASE + '/notificaciones', { headers: hA });
  const n = await r.json();
  const arr = n.alertas || n;
  console.log('NOTIF admin:', Array.isArray(arr) ? arr.map(a => a.clave || a.tipo).join(', ') : JSON.stringify(n).slice(0, 200));
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
