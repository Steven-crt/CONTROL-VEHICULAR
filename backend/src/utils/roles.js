// Roles vigentes: 'admin' y 'empleado'.
// Se siguen aceptando valores legacy (operador/cajero, ids 2/3) para que
// tokens o filas antiguas sigan resolviendo al rol unificado 'empleado'.
function normalizeRol(rol) {
  const r = String(rol ?? '').trim().toLowerCase();
  if (r === '1' || r === 'admin' || r === 'administrador') return 'admin';
  if (r === '2' || r === '3' || r === '4' || r === 'operador' || r === 'cajero' || r === 'empleado') return 'empleado';
  return r;
}

function getRol(usuario) {
  if (usuario?.rol_id !== undefined && usuario.rol_id !== null && String(usuario.rol_id).trim() !== '')
    return normalizeRol(usuario.rol_id);
  return normalizeRol(usuario?.rol);
}

module.exports = { normalizeRol, getRol };
