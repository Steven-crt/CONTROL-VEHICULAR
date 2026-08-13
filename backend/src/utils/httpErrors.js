function internalError(res, err, context) {
  console.error(`[${context}]`, err?.stack || err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { internalError };
