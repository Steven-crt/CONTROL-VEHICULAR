

const { obtenerIp } = require('../utils/obtenerIp');

function createLimiter({
  windowMs = 60 * 1000,
  max = 100,
  message = 'Demasiadas peticiones. Intenta más tarde.',
  keyFn = (req) => obtenerIp(req),
  statusCode = 429
} = {}) {
  const hits = new Map();

  const sweep = () => {
    const now = Date.now();
    for (const [k, rec] of hits) {
      if (now - rec.first > windowMs) hits.delete(k);
    }
  };
  setInterval(sweep, Math.max(windowMs / 2, 1000)).unref();

  return function rateLimit(req, res, next) {
    const key = keyFn(req);
    const now = Date.now();
    const rec = hits.get(key) || { count: 0, first: now };
    if (now - rec.first > windowMs) {
      rec.count = 0;
      rec.first = now;
    }
    rec.count += 1;
    hits.set(key, rec);

    if (rec.count > max) {
      const retry = Math.ceil((rec.first + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retry));
      return res.status(statusCode).json({ error: message });
    }
    next();
  };
}

module.exports = { createLimiter };