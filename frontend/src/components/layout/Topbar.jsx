import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Menu } from 'lucide-react';
import Notificaciones from './Notificaciones';

const breadcrumbs = {
  '/dashboard': 'Dashboard',
  '/vehiculos': 'Vehículos',
  '/movimiento': 'Movimiento y Gasto',
  '/reportes': 'Reportes',
  '/usuarios': 'Usuarios',
  '/configuracion': 'Configuración',
};

const matchBreadcrumb = (pathname) => {
  if (breadcrumbs[pathname]) return breadcrumbs[pathname];
  if (pathname.startsWith('/vehiculos/')) return 'Detalle del Vehículo';
  return 'Control Vehicular';
};

export default function Topbar({ setIsSidebarOpen }) {
  const { usuario } = useAuth();
  const location = useLocation();
  const page = matchBreadcrumb(location.pathname);
  const now = new Date().toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <header className="bg-cv-sidebar border-b border-cv-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden text-cv-muted hover:text-cv-text transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-cv-text font-semibold text-base md:text-lg whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-none">{page}</h2>
          <p className="hidden sm:block text-cv-muted text-xs capitalize">{now}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5 text-cv-muted text-sm">
          <Clock className="w-4 h-4" />
          <CurrentTime />
        </div>
        <Notificaciones />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cv-primary flex items-center justify-center">
            <span className="text-cv-accent font-bold text-xs uppercase">
              {usuario?.nombre?.[0]}
            </span>
          </div>
          <span className="text-cv-text text-sm font-medium hidden md:block">{usuario?.nombre}</span>
        </div>
      </div>
    </header>
  );
}

function CurrentTime() {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }));
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })), 30000);
    return () => clearInterval(t);
  }, []);
  return <span>{time}</span>;
}
