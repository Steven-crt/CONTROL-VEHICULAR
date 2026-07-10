const SENSITIVE_KEYS = ['password', 'token', 'secret', 'jwt', 'refreshToken'];

let inactivityTimer = null;
const INACTIVITY_LIMIT = 30 * 60 * 1000;
let onInactivityLogout = null;

export function sanitizarDisplay(texto) {
  if (typeof texto !== 'string') return texto;
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\\/g, '&#92;')
    .replace(/\//g, '&#47;');
}

export function sanitizarObjeto(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = sanitizarDisplay(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizarObjeto(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

export function limpiarDatosFormulario(data) {
  const limpio = {};
  for (const key in data) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      limpio[key] = data[key];
    } else if (typeof data[key] === 'string') {
      limpio[key] = data[key].trim().replace(/[<>]/g, '').replace(/[\0\x08\x0B\x1A]/g, '');
    } else {
      limpio[key] = data[key];
    }
  }
  return limpio;
}

export function esPasswordSegura(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export function validarPlaca(placa) {
  return /^[a-zA-Z0-9\-]+$/.test(placa);
}

export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


export function startInactivityMonitor(logoutFn) {
  onInactivityLogout = logoutFn;

  const resetTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    inactivityTimer = setTimeout(() => {
      if (onInactivityLogout) {
        onInactivityLogout();
      }
    }, INACTIVITY_LIMIT);
  };

  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  events.forEach(event => {
    document.addEventListener(event, resetTimer, { passive: true });
  });

  resetTimer();

  return () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    events.forEach(event => {
      document.removeEventListener(event, resetTimer);
    });
  };
}
