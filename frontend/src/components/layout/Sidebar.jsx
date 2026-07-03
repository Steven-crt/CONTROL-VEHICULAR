import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Truck, Fuel, Wrench, BarChart3, Settings, LogOut, Menu, X, Users, Navigation, Monitor, User
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import styles from './Sidebar.module.css'

const menuItems = [
  {
    section: 'PRINCIPAL',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    section: 'GESTION',
    items: [
      { path: '/vehiculos', icon: Truck, label: 'Vehículos' },
      { path: '/asignaciones', icon: Navigation, label: 'Mis Vehículos' },
      { path: '/monitoreo', icon: Monitor, label: 'Monitoreo' },
      { path: '/solicitudes-combustible', icon: Fuel, label: 'Combustible' },
      { path: '/mantenimientos', icon: Wrench, label: 'Mantenimientos' },
      { path: '/reportes', icon: BarChart3, label: 'Reportes' },
    ],
  },
  {
    section: 'ADMINISTRACION',
    adminOnly: true,
    items: [
      { path: '/asignaciones', icon: Users, label: 'Asignaciones' },
      { path: '/configuracion', icon: Settings, label: 'Usuarios' },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { usuario, logout } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'
  const filteredSections = menuItems.filter(s => !s.adminOnly || isAdmin)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (mobileOpen && onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <>
      <div
        className={`${styles.mobileBackdrop} ${mobileOpen ? styles.mobileBackdropVisible : ''}`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
        style={{ width: collapsed ? '70px' : 'var(--sidebar-width)' }}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <Truck size={28} />
            {!collapsed && <span>Control Vehicular</span>}
          </div>
          <button className={styles.sidebarToggle} onClick={onToggle}>
            {collapsed && !mobileOpen ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {filteredSections.map(section => (
            <div key={section.section}>
              {!collapsed && <div className={styles.sidebarSection}>{section.section}</div>}
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`}
                  onClick={handleNavClick}
                >
                  <item.icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink to="/perfil" className={styles.sidebarUser} onClick={handleNavClick}>
            <div className={styles.sidebarUserAvatar}>
              {usuario?.nombre?.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div>
                <div className={styles.sidebarUserName}>{usuario?.nombre} {usuario?.apellido}</div>
                <div className={styles.sidebarUserRol}>{usuario?.rol}</div>
              </div>
            )}
          </NavLink>
          <button className={styles.sidebarLogout} onClick={handleLogout}>
            <LogOut size={18} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
