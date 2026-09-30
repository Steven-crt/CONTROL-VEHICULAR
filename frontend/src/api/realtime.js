
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`);

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

function conectar() {
  if (source || conectando) return;
  conectando = true;

  source = new EventSource(`${API_BASE}/realtime/stream`, { withCredentials: true });

  source.onopen = () => {
    conectando = false;
    notificar('conectado', { ok: true });
  };

  source.addEventListener('combustible', (e) => {
    try { notificar(EVENTOS.COMBUSTIBLE, JSON.parse(e.data)); } catch { /* empty */ }
});
  source.addEventListener('mantenimiento', (e) => {
    try { notificar(EVENTOS.MANTENIMIENTO, JSON.parse(e.data)); } catch { /* empty */ }
  });
  source.addEventListener('anomalia', (e) => {
    try { notificar(EVENTOS.ANOMALIA, JSON.parse(e.data)); } catch { /* empty */ }
  });
  source.addEventListener('vehiculo', (e) => {
    try { notificar(EVENTOS.VEHICULO, JSON.parse(e.data)); } catch { /* empty */ }
  });

  source.onerror = () => {

    if (source && source.readyState === EventSource.CLOSED) {
      source = null;
      conectando = false;
    }
  };
}

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

import { useEffect, useRef } from 'react';
export function useRealTime(tipos, callback) {
  const cbRef = useRef(callback);
  // eslint-disable-next-line react-hooks/refs
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
