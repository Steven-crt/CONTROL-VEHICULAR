/**
 * Bus de eventos de autenticación.
 *
 * Permite que el interceptor de axios notifique al AuthProvider de un 401
 * sin usar window.location.href (que hace recarga completa y provoca el
 * loop infinito de login).
 *
 * Uso:
 *   - Interceptor: authEvents.emit('unauthorized')
 *   - AuthProvider: authEvents.on('unauthorized', handler)
 *                   authEvents.off('unauthorized', handler)  ← limpieza en useEffect
 */

const authEvents = new EventTarget();

export function emitUnauthorized() {
  authEvents.dispatchEvent(new Event('unauthorized'));
}

export function onUnauthorized(handler) {
  authEvents.addEventListener('unauthorized', handler);
}

export function offUnauthorized(handler) {
  authEvents.removeEventListener('unauthorized', handler);
}

export default authEvents;
