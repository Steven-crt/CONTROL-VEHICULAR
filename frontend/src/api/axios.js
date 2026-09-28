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
  
  withCredentials: true
});

// Sesión vía cookie httpOnly: no se usa localStorage para JWT (anti-XSS).
// El servidor lee la cookie cv_session con withCredentials:true.

// Rutas que reciben 401 como respuesta normal (no disparan logout).
// /auth/me  → sonda de sesión: 401 = no hay sesión activa (esperado al arrancar)
// /auth/login → credenciales incorrectas: el formulario gestiona el error
const SONDAS_SILENCIOSAS = ['/auth/me', '/auth/login'];


let emitiendo401 = false;



const GRACIA_MS = 8000;
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
      try { localStorage.removeItem('usuario'); } catch { /* empty */ }


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
