const BASE = 'http://localhost:3011/api';
(async () => {
  const la = await (await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'test_admin', password: 'test1234' }) })).json();
  const h = { Authorization: 'Bearer ' + la.token };
  const co = await (await fetch(BASE + '/reportes/combustible-resumen?desde=2026-01-01&hasta=2026-12-31', { headers: h })).json();
  console.log('combustible.por_periodo es array plano?', Array.isArray(co.por_periodo), '| primer elem:', JSON.stringify(co.por_periodo?.[0]));
  console.log('total:', co.total);
})();
