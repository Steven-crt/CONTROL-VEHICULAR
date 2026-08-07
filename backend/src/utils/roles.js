function normalizeRol(rol) {
  const r = String(rol ?? '').trim().toLowerCase();
  if (r === '1' || r === 'admin' || r === 'administrador') return 'admin';
  if (r === '2' || r === 'operador') return 'operador';
  if (r === '3' || r === 'cajero') return 'cajero';
  return r;
}

function getRol(usuario) {
  if (usuario?.rol_id !== undefined && usuario.rol_id !== null && String(usuario.rol_id).trim() !== '')
    return normalizeRol(usuario.rol_id);
  return normalizeRol(usuario?.rol);
}

module.exports = { normalizeRol, getRol };
