import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, LogOut, Users, Settings, BarChart3, Car, UserCircle, Activity
} from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehiculos', icon: Car,             label: 'Consulta Vehículos' },
  { to: '/movimiento',icon: Activity,        label: 'Movimiento y Gasto' },
  { to: '/clientes',  icon: UserCircle,      label: 'Clientes' },
  { to: '/reportes',  icon: BarChart3,       label: 'Reportes' },
  { to: '/usuarios',  icon: Users,           label: 'Usuarios' },
  { to: '/configuracion', icon: Settings,    label: 'Configuración' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { usuario, logout } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-park-sidebar border-r border-park-border flex flex-col shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-5 border-b border-park-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-park-accent rounded-xl flex flex-shrink-0 items-center justify-center shadow-lg overflow-hidden">
            {config?.logo_url ? (
              <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Car className="w-5 h-5 text-park-dark" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-park-text font-bold text-lg leading-tight truncate" title={config?.nombre_negocio || 'Control Vehicular'}>{config?.nombre_negocio || 'Control Vehicular'}</h1>
            <p className="text-park-muted text-xs truncate">Sistema de Gestión Vehicular</p>
          </div>
        </div>
      </div>

      {/* Usuario */}
      <div className="px-4 py-3 border-b border-park-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-park-primary flex items-center justify-center">
            <span className="text-park-accent font-bold text-sm uppercase">
              {usuario?.nombre?.[0] || 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-park-text text-sm font-medium truncate">{usuario?.nombre}</p>
            <p className="text-park-accent text-xs capitalize">{usuario?.rol}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-200 group
              ${isActive
                ? 'bg-park-accent text-park-dark shadow-lg shadow-amber-500/20'
                : 'text-park-muted hover:text-park-text hover:bg-park-border/30'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-park-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium text-park-muted hover:text-park-ocupado hover:bg-red-900/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
