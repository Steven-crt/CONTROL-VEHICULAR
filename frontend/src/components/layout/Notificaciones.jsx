import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Fuel, AlertTriangle, Wrench, Car, DollarSign } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import api from '../../api/axios';

const ring = keyframes`
  0% { transform: rotate(0deg); }
  15% { transform: rotate(12deg); }
  30% { transform: rotate(-10deg); }
  45% { transform: rotate(6deg); }
  60% { transform: rotate(-4deg); }
  75% { transform: rotate(2deg); }
  100% { transform: rotate(0deg); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
`;

const BellButton = styled.button`
  position: relative;
  color: #9ca3af;
  transition: color 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #f59e0b;
  }

  &.has-alerts {
    animation: ${pulse} 2s ease-in-out infinite;
  }

  &.ringing svg {
    animation: ${ring} 0.6s ease-in-out;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 0 0 2px #1f2937;
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 460px;
  overflow-y: auto;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 100;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 3px; }
`;

const Header = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #374151;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitle = styled.h3`
  color: #f3f4f6;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover { color: #f3f4f6; }
`;

const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
`;

const NotifItem = styled.div`
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #1f2937;

  &:hover { background: rgba(245, 158, 11, 0.06); }
  &:last-child { border-bottom: none; }
`;

const iconByType = {
  warning: '#f59e0b',
  info: '#3b82f6',
};

const iconMap = {
  fuel: Fuel,
  alert: AlertTriangle,
  wrench: Wrench,
  car: Car,
  dollar: DollarSign,
};

const NotifIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${p => {
    const base = iconByType[p.$tipo] || '#6b7280';
    return `${base}1a`;
  }};
  color: ${p => iconByType[p.$tipo] || '#6b7280'};
`;

const NotifContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotifTitle = styled.p`
  margin: 0;
  color: #f3f4f6;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NotifMsg = styled.p`
  margin: 2px 0 0;
  color: #9ca3af;
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export default function Notificaciones() {
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
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleClick = (n) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const warnCount = notifs.filter(n => n.tipo === 'warning').length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <BellButton
        className={`relative ${warnCount > 0 ? 'has-alerts' : ''} ${ringing ? 'ringing' : ''}`}
        onClick={() => setOpen(p => !p)}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {notifs.length > 0 && <Badge>{notifs.length}</Badge>}
      </BellButton>

      {open && (
        <Dropdown>
          <Header>
            <HeaderTitle>Notificaciones</HeaderTitle>
            <CloseBtn onClick={() => setOpen(false)}>
              <X size={16} />
            </CloseBtn>
          </Header>

          {notifs.length === 0 ? (
            <EmptyState>Sin novedades</EmptyState>
          ) : (
            notifs.map((n, i) => {
              const Icon = iconMap[n.icono] || AlertTriangle;
              return (
                <NotifItem key={i} onClick={() => handleClick(n)}>
                  <NotifIcon $tipo={n.tipo}>
                    <Icon size={16} />
                  </NotifIcon>
                  <NotifContent>
                    <NotifTitle>{n.titulo}</NotifTitle>
                    <NotifMsg>{n.mensaje}</NotifMsg>
                  </NotifContent>
                </NotifItem>
              );
            })
          )}
        </Dropdown>
      )}
    </div>
  );
}
