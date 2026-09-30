  import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Fuel, AlertTriangle, Wrench, Car, DollarSign } from 'lucide-react';
import './Notificaciones.css';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../api/realtime';

const iconMap = {
  fuel: Fuel,
  alert: AlertTriangle,
  wrench: Wrench,
  car: Car,
  dollar: DollarSign,
};

export default function Notificaciones() {
  const { usuario } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const ref = useRef(null);
  const prevCount = useRef(0);
  const navigate = useNavigate();

  const fetchNotifs = async () => {
    try {
      const { data } = await api.get('/notificaciones');
      setNotifs(data);
      if (data.length > prevCount.current) {
        setRinging(true);
        setTimeout(() => setRinging(false), 600);
      }
      prevCount.current = data.length;
    } catch { /* silently */ }
  };

  useEffect(() => {
    // No hacer polling sin sesión: cada 401 disparaba el interceptor y
    // alimentaba el bucle que saturaba el rate-limit.
    if (!usuario) return;

    let mounted = true;
    const controller = new AbortController();
    const safeFetch = async () => {
      if (!mounted) return;
      try {
        const { data } = await api.get('/notificaciones', { signal: controller.signal });
        if (!mounted) return;
        setNotifs(data);
        if (data.length > prevCount.current) {
          setRinging(true);
          setTimeout(() => setRinging(false), 600);
        }
        prevCount.current = data.length;
      } catch (err) {
        // Si la sesión expiró (401), detener el polling para no agravar el bucle
        if (err?.response?.status === 401 && mounted) {
          controller.abort();
        }
      }
    };
    safeFetch();
    const interval = setInterval(safeFetch, 30000);
    return () => { mounted = false; controller.abort(); clearInterval(interval); };
  }, [usuario]);

  // Tiempo real: si llega cualquier cambio (nuevo pedido, aprobación, anomalía,
  // vehículo), refrescamos las notificaciones al instante para que el badge se
  // actualice con 2+ usuarios conectados.
  const fetchLive = useCallback(() => { fetchNotifs(); }, []);
  useRealTime('global', fetchLive);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const marcarVistas = async (claves) => {
    if (!claves.length) return;
    setNotifs(prev => prev.filter(n => !claves.includes(n.clave)));
    try {
      await api.post('/notificaciones/vista', { claves });
    } catch { /* si falla, la próxima recarga las vuelve a traer */ }
  };


  const warningConst = notifs.filter(n => n.tipo === 'warning').length;
  if (warningConst > 0 && !ringing) {
    setRinging(true);
    setTimeout(() => setRinging(false), 600);
    
  }

  const handleClick = (n) => {
    setOpen(false);
    marcarVistas([n.clave]);
    if (n.link) navigate(n.link);
  };

  const handleMarcarTodas = () => {
    marcarVistas(notifs.map(n => n.clave));
  };

  const warnCount = notifs.filter(n => n.tipo === 'warning').length;

  return (
    <div ref={ref} className="relative">
      <BellButton
        className={`notif-bell ${warnCount > 0 ? 'has-alerts' : ''} ${ringing ? 'ringing' : ''}`}
        onClick={() => setOpen(p => !p)}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {notifs.length > 0 && <span className="notif-badge">{notifs.length}</span>}
      </BellButton>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h3 className="notif-header-title">Notificaciones</h3>
            {notifs.length > 0 && (
              <button
                onClick={handleMarcarTodas}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                Marcar todas
              </button>
            )}
            <button onClick={() => setOpen(false)} className="notif-close" aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>

          {notifs.length === 0 ? (
            <div className="notif-empty">Sin novedades</div>
          ) : (
            notifs.map((n) => {
              const Icon = iconMap[n.icono] || AlertTriangle;
              const variant = n.tipo === 'warning' ? 'notif-icon--warning' : n.tipo === 'info' ? 'notif-icon--info' : '';
              return (
                <div key={n.clave} onClick={() => handleClick(n)} className="notif-item">
                  <div className={`notif-icon ${variant}`}>
                    <Icon size={16} />
                  </div>
                  <div className="notif-content">
                    <p className="notif-title">{n.titulo}</p>
                    <p className="notif-msg">{n.mensaje}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
