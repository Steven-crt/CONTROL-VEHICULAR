/**
 * Conexión de tiempo real (SSE) entre el frontend y el backend.
 *
 * El servidor mantiene un stream abierto (/api/realtime/stream) y no empuja
 * datasets completos: solo emite eventos de INVALIDACIÓN (p.ej. "combustible:
 * llegó un pedido nuevo"). Cada oyente re-fetcha los datos que le interesan en
 * el instante, de modo que con 2+ usuarios conectados los cambios se ven
 * al instante, sin esperar al polling de 30s.
 *
 * Uso (para componentes):
 *   import { useRealTime } from '../api/realtime';
 *   useRealTime('combustible', () => { fetchPedidos(); });
 *   // o escuchar varios:
 *   useRealTime(['combustible', 'mantenimiento'], refrescar);
 *
 * La conexión se pausa cuando no hay sesión y se reanuda al loguearse:
 *   iniciarRealTime() / detenerRealTime() (lo gestiona el AuthProvider).
 */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`);

// Eventos que el backend puede emitir. El cliente escucha estos nombres.
// 'global' es un comodín: se dispara ante CUALQUIER evento de invalidación.
const EVENTOS = {
  COMBUSTIBLE: 'combustible',
  MANTENIMIENTO: 'mantenimiento',
  ANOMALIA: 'anomalia',
  VEHICULO: 'vehiculo',
  GLOBAL: 'global'
};

const realtimeBus = new EventTarget();
let source = null;
let conectando = false;

function notificar(tipo, data) {
  realtimeBus.dispatchEvent(new CustomEvent(tipo, { detail: data }));
  realtimeBus.dispatchEvent(new CustomEvent('global', { detail: { tipo, ...data } }));
}

// Abre la conexión SSE. EventSource reconecta solo; además forzamos el
// rearme de listeners tras cada reconexión del navegador.
function conectar() {
  if (source || conectando) return;
  conectando = true;

  source = new EventSource(`${API_BASE}/realtime/stream`, { withCredentials: true });

  source.onopen = () => {
    conectando = false;
    notificar('conectado', { ok: true });
  };

  // por cada evento nombrado del backend
  source.addEventListener('combustible', (e) => {
    try { notificar(EVENTOS.COMBUSTIBLE, JSON.parse(e.data)); } catch {}
  });
  source.addEventListener('mantenimiento', (e) => {
    try { notificar(EVENTOS.MANTENIMIENTO, JSON.parse(e.data)); } catch {}
  });
  source.addEventListener('anomalia', (e) => {
    try { notificar(EVENTOS.ANOMALIA, JSON.parse(e.data)); } catch {}
  });
  source.addEventListener('vehiculo', (e) => {
    try { notificar(EVENTOS.VEHICULO, JSON.parse(e.data)); } catch {}
  });

  source.onerror = () => {
    // EventSource se reconecta solo; solo soltamos la referencia cuando la
    // conexión está muerta de verdad para poder reconectar limpiamente.
    if (source && source.readyState === EventSource.CLOSED) {
      source = null;
      conectando = false;
    }
  };
}

// Cierra la conexión y desactiva la reconexión automática.
function detener() {
  if (source) {
    source.close();
    source = null;
    conectando = false;
  }
}

function iniciar() {
  if (import.meta.env.VITE_PASAR_ALTO === '1') return; // respaldo de emergencia (no usado)
  conectar();
}

// Hook React: llama `callback` (con la data del evento) cada vez que ocurre
// un evento de los indicados en `tipos` ('combustible', 'mantenimiento', ...).
import { useEffect, useRef } from 'react';
export function useRealTime(tipos, callback) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const tiposArr = Array.isArray(tipos) ? tipos : [tipos];

  useEffect(() => {
    const handler = (ev) => cbRef.current?.(ev.detail);
    for (const t of tiposArr) {
      realtimeBus.addEventListener(t, handler);
    }
    return () => {
      for (const t of tiposArr) {
        realtimeBus.removeEventListener(t, handler);
      }
    };
  }, [tiposArr.join(',')]);
}

export { EVENTOS, iniciar as iniciarRealTime, detener as detenerRealTime };
export default realtimeBus;
