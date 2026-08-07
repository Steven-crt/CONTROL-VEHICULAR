function normalizeRol(rol) {
  const r = String(rol ?? '').toLowerCase();
  if (r === '1' || r === 'admin') return 'admin';
  if (r === '2' || r === 'operador') return 'operador';
  if (r === '3' || r === 'cajero') return 'cajero';
  return r;
}

module.exports = { normalizeRol };
