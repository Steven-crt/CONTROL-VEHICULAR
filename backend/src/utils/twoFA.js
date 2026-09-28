// Autenticación de dos factores (TOTP) y gestión de pedidos de 2FA
const speakeasy = require('speakeasy');
const pedidos2FA = new Map();

const TTL_PEDIDO_MS = 5 * 60 * 1000; // 5 minutos

// Emite un pedido de 2FA para un usuario tras login válido con 2FA activo.
function crearPedido2FA(usuarioId) {
  const firma = speakeasy.generateSecret({ length: 32 }).base32.slice(0, 24);
  pedidos2FA.set(firma, { usuarioId, expiraEn: Date.now() + TTL_PEDIDO_MS });
  // Limpieza perezosa: borrar el pedido al expirar (evita fuga de memoria)
  setTimeout(() => pedidos2FA.delete(firma), TTL_PEDIDO_MS + 1000).unref();
  return firma;
}

// Valida un pedido de 2FA y devuelve el usuarioId, o null si es inválido/expirado.
function consumirPedido2FA(firma) {
  const pedido = pedidos2FA.get(firma);
  if (!pedido) return null;
  if (Date.now() > pedido.expiraEn) {
    pedidos2FA.delete(firma);
    return null;
  }
  pedidos2FA.delete(firma); // single-use
  return pedido.usuarioId;
}

// Verifica un código TOTP contra el secreto de un usuario.
function verificarTOTP(secretoBase32, codigo) {
  if (!secretoBase32 || !codigo) return false;
  return speakeasy.totp.verify({
    secret: secretoBase32,
    encoding: 'base32',
    token: String(codigo).replace(/\s/g, ''),
    window: 1 // tolerancia ±1 período (30s) por desfase de reloj
  });
}

function limpiarPedidosExpirados() {
  const ahora = Date.now();
  for (const [fir, ped] of pedidos2FA) {
    if (ahora > ped.expiraEn) pedidos2FA.delete(fir);
  }
}

module.exports = { crearPedido2FA, consumirPedido2FA, verificarTOTP, limpiarPedidosExpirados };
