const BASE = 'http://localhost:3011/api';
(async () => {
  const r = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test_admin', password: 'test1234' })
  });
  console.log('STATUS:', r.status);
  console.log('BODY:', await r.text());

  // comparar con admin clonado de producción
  const r2 = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  console.log('ADMIN CLONADO STATUS:', r2.status);
})();
