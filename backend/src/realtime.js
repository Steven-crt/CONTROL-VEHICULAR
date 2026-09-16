


const EVENTOS = {
  COMBUSTIBLE: 'combustible',
  MANTENIMIENTO: 'mantenimiento',
  ANOMALIA: 'anomalia',
  VEHICULO: 'vehiculo',
  NOTIFICACIONES: 'notificaciones'
};

// clientes conectados: Map<id, { res, usuarioId, rol, heartbeat }>
const clientes = new Map();
let nextId = 1;

// Cabeceras para evitar que proxies / navegador buffereen la respuesta SSE
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no'
};

// Registra un cliente SSE autenticado y devuelve un objeto {id, close()}
function registrarCliente(res, usuario) {
  const id = nextId++;
  const entrada = { res, usuarioId: usuario?.id ?? null, rol: usuario?.rol ?? null, heartbeat: null };

  res.writeHead(200, SSE_HEADERS);
  // saludo inicial: envío el id para que el cliente sepa que está conectado
  res.write(`id: ${id}\n`);
  res.write(`event: conectado\ndata: {"status":"ok","clienteId":${id}}\n\n`);

  // latido cada 25s para mantener viva la conexión a través de proxies
  entrada.heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* socket roto, lo cierra el cleanup */ }
  }, 25000);

  clientes.set(id, entrada);

  // limpieza cuando el cliente se desconecta
  const clean = () => {
    if (entrada.heartbeat) clearInterval(entrada.heartbeat);
    clientes.delete(id);
    try { res.end(); } catch { /* ya cerrado */ }
  };
  req_cleanup(res, id, clean);

  return { id, close: clean };
}

// Registra manejadores de cierre (request abort / response close)
function req_cleanup(res, id, clean) {
  const onClose = () => {
    res.removeListener('close', onClose);
    res.removeListener('finish', onClose);
    clean();
  };
  res.on('close', onClose);
  res.on('finish', onClose);
}


function emitirCambio(tip, data = {}) {
  const payload = JSON.stringify(data);
  for (const [id, c] of clientes) {
    try {
      c.res.write(`event: ${tip}\ndata: ${payload}\n\n`);
    } catch {
      // socket roto: se limpia solo en el siguiente close
    }
  }
}

// Emite un evento a los clientes de un rol concreto (p.ej. solo admins).
function emitirCambioRol(tip, rol, data = {}) {
  const payload = JSON.stringify(data);
  for (const [id, c] of clientes) {
    if (c.rol !== rol) continue;
    try {
      c.res.write(`event: ${tip}\ndata: ${payload}\n\n`);
    } catch { /* ignora sockets rotos */ }
  }
}

// Devuelve estadísticas del hub (útil para debugging)
function stats() {
  return { conectados: clientes.size };
}

module.exports = { EVENTOS, registrarCliente, emitirCambio, emitirCambioRol, stats };
