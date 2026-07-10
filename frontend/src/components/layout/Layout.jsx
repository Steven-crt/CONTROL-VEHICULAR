import { useState, useCallback, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import styles from './Layout.module.css'

const pageTitles = {
  '/': 'Dashboard',
  '/vehiculos': 'Vehículos',
  '/asignaciones': 'Asignaciones',
  '/monitoreo': 'Monitoreo',
  '/solicitudes-combustible': 'Combustible',
  '/mantenimientos': 'Mantenimientos',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración'
}

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sceneRef = useRef(null)
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Control Vehicular'

  const isVehiculoPerfil = location.pathname.startsWith('/vehiculos/') && location.pathname !== '/vehiculos'
  const displayTitle = isVehiculoPerfil ? 'Perfil del Vehículo' : title

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  const handleToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen(prev => !prev)
    } else {
      setSidebarCollapsed(prev => !prev)
    }
  }, [isMobile])

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileOpen])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (isMobile || !sceneRef.current) return
    const scene = sceneRef.current
    const handleMouse = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      scene.style.setProperty('--parallax-x', x.toFixed(3))
      scene.style.setProperty('--parallax-y', y.toFixed(3))
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [isMobile])

  const particlesCount = isMobile ? 8 : 45
  const particles = Array.from({ length: particlesCount }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: isMobile ? 1.5 + Math.random() * 2 : (i < 10 ? 3 + Math.random() * 4 : 1.5 + Math.random() * 2.5),
    delay: Math.random() * 15,
    duration: 10 + Math.random() * 20,
    opacity: isMobile ? 0.2 + Math.random() * 0.3 : (i < 10 ? 0.6 + Math.random() * 0.4 : 0.4 + Math.random() * 0.5),
    isGlow: !isMobile && i < 10,
  }))

  const orbs = isMobile ? [] : [
    { id: 1, left: 15, top: 25, size: 350, color: 'rgba(66, 245, 155, 0.15)', delay: 0 },
    { id: 2, left: 75, top: 55, size: 300, color: 'rgba(104, 216, 255, 0.12)', delay: 2 },
    { id: 3, left: 50, top: 10, size: 250, color: 'rgba(247, 185, 85, 0.1)', delay: 4 },
    { id: 4, left: 25, top: 70, size: 280, color: 'rgba(66, 245, 155, 0.1)', delay: 6 },
    { id: 5, left: 80, top: 15, size: 220, color: 'rgba(104, 216, 255, 0.08)', delay: 3 },
  ]

  const streamCount = isMobile ? 2 : 6
  const streams = Array.from({ length: streamCount }, (_, i) => ({
    id: i,
    left: isMobile ? 15 + i * 45 : 10 + i * 16,
    delay: Math.random() * 8,
    duration: 3 + Math.random() * 4,
  }))

  const marginLeft = mobileOpen ? 0 : (sidebarCollapsed ? '70px' : 'var(--sidebar-width)')

  return (
    <div className={styles.layout}>
      <div className={styles.ambientScene} ref={sceneRef} aria-hidden="true">
        <span className={styles.routePlane} />
        <span className={styles.signalOrb} />
        <span className={styles.depthBeam} />
        <span className={styles.geoHex} />
        <span className={styles.geoHex2} />
        <span className={styles.geoRing} />
        <span className={styles.scanLine} />
        {orbs.map(o => (
          <span key={o.id} className={styles.glowOrb}
            style={{
              left: `${o.left}%`,
              top: `${o.top}%`,
              width: o.size,
              height: o.size,
              background: `radial-gradient(circle, ${o.color}, transparent 70%)`,
              animationDelay: `${o.delay}s`,
            }}
          />
        ))}
        {streams.map(s => (
          <span key={s.id} className={styles.dataStream} style={{ left: `${s.left}%`, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}>
            {Array.from({ length: 5 }, (_, j) => (
              <span key={j} className={styles.streamDot}
                style={{
                  top: `${j * 25}%`,
                  animationDelay: `${j * 0.4 + s.delay}s`,
                  animationDuration: `${s.duration}s`,
                }}
              />
            ))}
          </span>
        ))}
        {particles.map(p => (
          <span key={p.id} className={p.isGlow ? styles.glowParticle : styles.particle}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />
      <div className={styles.layoutMain} style={{ marginLeft }}>
        <Topbar onMenuClick={handleToggle} title={displayTitle} />
        <main className={styles.layoutContent} key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
