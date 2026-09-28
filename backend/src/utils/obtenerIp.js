// Obtener la IP del cliente (IPv4 o IPv6)

function obtenerIp(req) {

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

module.exports = { obtenerIp };