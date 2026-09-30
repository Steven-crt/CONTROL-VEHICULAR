
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
