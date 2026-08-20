import axios from 'axios';

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

// Interceptor: agregar JWT token en cada request
// (fallback: si aún hay token en localStorage de sesiones viejas, se envía;
//  el servidor prioriza la cookie httpOnly sobre el header)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejar errores 401 (token expirado) — sin recargar en el login.
// /auth/me es una sonda de sesión: 401 es normal cuando no hay sesión,
// no debe disparar cleanup ni redirect (el AuthContext se encarga).
const SONDAS_SILENCIOSAS = ['/auth/me'];

api.interceptors.response.use(
  r => r,
  err => {
    if (
      err.response?.status === 401 &&
      !err.config?.url?.includes('/auth/login') &&
      !SONDAS_SILENCIOSAS.some(s => err.config?.url?.includes(s))
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;