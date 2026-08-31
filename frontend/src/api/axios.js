import axios from 'axios';
import { emitUnauthorized } from './authEvents';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`);

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 25000,
  // Envía la cookie httpOnly de sesión en peticiones cross-origin
  // (frontend en Vercel, API en Render)
  withCredentials: true
});

// Sesión vía cookie httpOnly: no se usa localStorage para JWT (anti-XSS).
// El servidor lee la cookie cv_session con withCredentials:true.

// Rutas que reciben 401 como respuesta normal (no disparan logout).
// /auth/me  → sonda de sesión: 401 = no hay sesión activa (esperado al arrancar)
// /auth/login → credenciales incorrectas: el formulario gestiona el error
const SONDAS_SILENCIOSAS = ['/auth/me', '/auth/login'];

// Guard anti-ráfaga: si múltiples peticiones fallan 401 a la vez, solo
// se emite el evento una vez. Se resetea tras 3 s.
let emitiendo401 = false;

// Período de gracia post-login/refresh: durante GRACIA_MS tras un login exitoso
// o restauración de sesión, los 401 transitorios (cookie aún no propagada,
// cold-start de Render, CORS preflight, etc.) se silencian para no disparar
// un logout/redirect inmediato.
const GRACIA_MS = 8000; // 8 s — suficiente para cold start de Render (~5-7 s)
let graciaPostLogin = false;
let graciaTimer = null;

export function activarGraciaPostLogin() {
  graciaPostLogin = true;
  if (graciaTimer) clearTimeout(graciaTimer);
  graciaTimer = setTimeout(() => { graciaPostLogin = false; graciaTimer = null; }, GRACIA_MS);
}

api.interceptors.response.use(
  r => r,
  err => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    const esSilenciosa = SONDAS_SILENCIOSAS.some(s => url.includes(s));

    if (status === 401 && !esSilenciosa) {
      // Durante el período de gracia, silenciar el 401 transitorio.
      // Los componentes manejan el error en su propio catch.
      if (graciaPostLogin) {
        return Promise.reject(err);
      }

      // Limpiar datos de sesión locales
      try { localStorage.removeItem('usuario'); } catch {}

      // Notificar al AuthProvider vía event bus (SIN window.location.href).
      // El AuthProvider llama setUsuario(null) y React Router navega a /login
      // sin recargar la página → se rompe el loop infinito.
      if (!emitiendo401) {
        emitiendo401 = true;
        emitUnauthorized();
        setTimeout(() => { emitiendo401 = false; }, 3000);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
