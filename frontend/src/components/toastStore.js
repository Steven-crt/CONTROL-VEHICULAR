const TOAST_DURATION_MS = 4000;

let seq = 0;
const items = [];
const subscribers = new Set();

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function dismiss(id) {
  const i = items.findIndex(t => t.id === id);
  if (i === -1) return;
  items.splice(i, 1);
  for (const fn of subscribers) fn([...items]);
}

function push(type, message) {
  const id = ++seq;
  items.push({ id, type, message });
  for (const fn of subscribers) fn([...items]);
  setTimeout(() => dismiss(id), TOAST_DURATION_MS);
}

export const toast = {
  success: (message) => push('success', message),
  error: (message) => push('error', message),
  dismiss,
};

export const currentToasts = () => [...items];

export default toast;
