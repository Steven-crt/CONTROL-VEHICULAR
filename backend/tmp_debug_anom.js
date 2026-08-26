const BASE = 'http://localhost:3011/api';
(async () => {
  const la = await (await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'test_admin', password: 'test1234' }) })).json();
  const r = await fetch(BASE + '/reportes/anomalias-resumen?desde=2026-01-01&hasta=2026-12-31', { headers: { Authorization: 'Bearer ' + la.token } });
  console.log('STATUS', r.status);
  console.log(JSON.stringify(await r.json(), null, 2).slice(0, 1200));
})();
