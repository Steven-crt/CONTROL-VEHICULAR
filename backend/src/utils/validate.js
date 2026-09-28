// Validación de datos de entrada (body, query, params)

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_PLACA = /^[A-Za-z0-9-]{3,15}$/;

function str(value, { min = 0, max = 255, required = false, trim = true, label = 'campo' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) return { ok: false, error: `${label} es requerido` };
    return { ok: true, value: null };
  }
  if (typeof value !== 'string') return { ok: false, error: `${label} debe ser texto` };
  const v = trim ? value.trim() : value;
  if (v.length < min) return { ok: false, error: `${label} debe tener al menos ${min} caracteres` };
  if (v.length > max) return { ok: false, error: `${label} no puede exceder ${max} caracteres` };
  return { ok: true, value: v };
}

function num(value, { min = -Infinity, max = Infinity, required = false, label = 'campo' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) return { ok: false, error: `${label} es requerido` };
    return { ok: true, value: null };
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return { ok: false, error: `${label} debe ser un número` };
  if (n < min) return { ok: false, error: `${label} debe ser mayor o igual a ${min}` };
  if (n > max) return { ok: false, error: `${label} debe ser menor o igual a ${max}` };
  return { ok: true, value: n };
}

function bool(value, { required = false, label = 'campo' } = {}) {
  if (value === undefined || value === null) {
    if (required) return { ok: false, error: `${label} es requerido` };
    return { ok: true, value: null };
  }
  return { ok: true, value: !!value };
}

function date(value, { required = false, label = 'fecha' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) return { ok: false, error: `${label} es requerido` };
    return { ok: true, value: null };
  }
  if (typeof value !== 'string') return { ok: false, error: `${label} debe ser una fecha` };
  const v = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return { ok: false, error: `${label} debe tener formato AAAA-MM-DD` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.slice(0, 10))) return { ok: false, error: `${label} debe tener formato AAAA-MM-DD` };
  const d = new Date(v);
  if (isNaN(d.getTime())) return { ok: false, error: `${label} no es una fecha válida` };
  return { ok: true, value: v.slice(0, 10) };
}

function email(value, { required = false, label = 'email' } = {}) {
  const r = str(value, { max: 100, required, trim: true, label });
  if (!r.ok) return r;
  if (r.value !== null && !RE_EMAIL.test(r.value)) return { ok: false, error: `${label} no es un email válido` };
  return r;
}

function placa(value, { required = false, label = 'placa' } = {}) {
  const r = str(value, { max: 15, required, trim: true, label });
  if (!r.ok) return r;
  if (r.value !== null && !RE_PLACA.test(r.value)) return { ok: false, error: `${label} tiene formato inválido` };
  return r;
}

function intId(value, { label = 'id' } = {}) {
  return num(value, { min: 1, max: 2147483647, required: true, label });
}

function body(schema, raw) {
  const values = {};
  for (const [field, [fn, opts]] of Object.entries(schema)) {
    const r = fn(raw?.[field], opts);
    if (!r.ok) return { ok: false, error: r.error };
    values[field] = r.value;
  }
  return { ok: true, values };
}

module.exports = { str, num, bool, date, email, placa, intId, body };