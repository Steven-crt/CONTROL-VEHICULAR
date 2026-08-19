function internalError(res, err, context) {
  console.error(`[${context}]`, err?.stack || err);
  if (res.headersSent) return;
  // Si el error trae statusCode propio (p.ej. 503 por pool saturado), se respeta;
  // el mensaje sigue siendo genérico para no filtrar detalles internos.
  const status = err?.statusCode && err.statusCode >= 400 && err.statusCode <= 599
    ? err.statusCode
    : 500;
  res.status(status).json({ error: status === 503 ? 'Servicio saturado, intenta de nuevo en unos segundos' : 'Error interno del servidor' });
}

module.exports = { internalError };
