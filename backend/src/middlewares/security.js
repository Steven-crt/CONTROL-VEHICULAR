const rateLimit = require('express-rate-limit');

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Demasiadas solicitudes, intente de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false
});

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesion. Intente de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false
});

const limiterCreacion = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Ha superado el limite de creacion de registros por hora' },
  standardHeaders: true,
  legacyHeaders: false
});

const limiterPassword = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Demasiados intentos de cambio de contrasena. Intente de nuevo en 1 hora' },
  standardHeaders: true,
  legacyHeaders: false
});

const userLimiters = new Map();

function limiterPorUsuario(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const userId = req.usuario?.id;
    if (!userId) return next();

    const key = `user_${userId}`;
    const now = Date.now();

    if (!userLimiters.has(key)) {
      userLimiters.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userLimiter = userLimiters.get(key);

    if (now > userLimiter.resetTime) {
      userLimiter.count = 1;
      userLimiter.resetTime = now + windowMs;
      return next();
    }

    userLimiter.count++;

    if (userLimiter.count > maxRequests) {
      const retryAfter = Math.ceil((userLimiter.resetTime - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        error: `Limite de solicitudes excedido. Intente de nuevo en ${Math.ceil(retryAfter / 60)} minutos`
      });
    }

    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userLimiters.entries()) {
    if (now > value.resetTime) {
      userLimiters.delete(key);
    }
  }
}, 5 * 60 * 1000);

function sanitizarInput(req, res, next) {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim().replace(/[<>]/g, '');
      }
    }
  }
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim().replace(/[<>]/g, '');
      }
    }
  }
  next();
}

function ocultarErrores(err, req, res, next) {
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ error: 'Error de validacion en los datos' });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ error: 'Error de referencia: el registro esta siendo usado' });
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ error: 'Error en el formato de la solicitud' });
  }
  next(err);
}

function verificarSQLInjection(req, res, next) {
  const patrones = /(';|--|DROP\s|DELETE\s|INSERT\s|EXEC\s|xp_cmdshell|UNION\sSELECT)/i;
  const campos = [];

  if (req.body) campos.push(...Object.values(req.body).filter(v => typeof v === 'string'));
  if (req.query) campos.push(...Object.values(req.query).filter(v => typeof v === 'string'));

  for (const valor of campos) {
    if (patrones.test(valor)) {
      return res.status(400).json({ error: 'Se detecto un intento de ataque' });
    }
  }
  next();
}

function validarCamposRequeridos(campos) {
  return (req, res, next) => {
    const faltantes = campos.filter(c => !req.body[c]);
    if (faltantes.length > 0) {
      return res.status(400).json({
        error: `Campos requeridos faltantes: ${faltantes.join(', ')}`
      });
    }
    next();
  };
}

const { encrypt, decrypt, mask } = require('../utils/encryption');

function maskSensitiveData(data, userRole) {
  if (!data) return data;
  const isAdmin = userRole === 'Administrador';

  const fieldsToMask = {
    vehiculo: ['numero_motor', 'numero_chasis'],
    usuario: ['telefono'],
    proveedor: ['telefono', 'email']
  };

  function applyMasking(obj, entityType) {
    if (!obj || typeof obj !== 'object') return obj;
    const fields = fieldsToMask[entityType] || [];
    fields.forEach(field => {
      if (obj[field] !== undefined && obj[field] !== null) {
        if (!isAdmin) {
          obj[field] = mask(obj[field]);
        }
      }
    });
    return obj;
  }

  if (Array.isArray(data)) {
    return data.map(item => {
      if (item.vehiculo !== undefined) item.vehiculo = applyMasking(item.vehiculo, 'vehiculo');
      if (item.usuario !== undefined) item.usuario = applyMasking(item.usuario, 'usuario');
      if (item.proveedor !== undefined) item.proveedor = applyMasking(item.proveedor, 'proveedor');
      return applyMasking(applyMasking(applyMasking(item, 'vehiculo'), 'usuario'), 'proveedor');
    });
  }

  return applyMasking(applyMasking(applyMasking(data, 'vehiculo'), 'usuario'), 'proveedor');
}

module.exports = {
  limiterGeneral,
  limiterAuth,
  limiterCreacion,
  limiterPassword,
  limiterPorUsuario,
  sanitizarInput,
  ocultarErrores,
  verificarSQLInjection,
  validarCamposRequeridos,
  maskSensitiveData
};
