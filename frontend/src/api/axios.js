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
      if (graciaPostLogin) {
        return Promise.reject(err);
      }

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
