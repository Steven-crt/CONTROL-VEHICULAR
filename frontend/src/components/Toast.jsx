import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { subscribe, dismiss, currentToasts } from './toastStore';
import './Toast.css';

export function Toaster() {
  const [toasts, setToasts] = useState(currentToasts);

  useEffect(() => subscribe(setToasts), []);

  return (
    <div className="toaster" aria-live="polite" aria-label="Avisos">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.type === 'success'
            ? <CheckCircle2 size={18} className="toast-icon" />
            : <XCircle size={18} className="toast-icon" />}
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toaster;
