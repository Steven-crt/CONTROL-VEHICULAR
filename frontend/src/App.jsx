import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/layout/Layout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const VehiculosPage = lazy(() => import('./pages/VehiculosPage'))
const VehiculoPerfilPage = lazy(() => import('./pages/VehiculoPerfilPage'))
const SolicitudesCombustiblePage = lazy(() => import('./pages/SolicitudesCombustiblePage'))
const MantenimientosPage = lazy(() => import('./pages/MantenimientosPage'))
const ReportesPage = lazy(() => import('./pages/ReportesPage'))
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'))
const AsignacionesPage = lazy(() => import('./pages/AsignacionesPage'))
const MonitoreoPage = lazy(() => import('./pages/MonitoreoPage'))
const PerfilPage = lazy(() => import('./pages/PerfilPage'))

function PrivateRoute({ children }) {
  const { usuario, checkAuth, initInactivityMonitor } = useAuthStore()

  useEffect(() => {
    checkAuth()
    if (usuario) {
      initInactivityMonitor()
    }
  }, [])

  return usuario ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { usuario } = useAuthStore()
  return usuario ? <Navigate to="/" replace /> : children
}

function Loading() {
  return (
    <div className="app-loading">
      <div className="loader-3d" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="loader-text">Cargando modulo seguro...</div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="vehiculos" element={<VehiculosPage />} />
          <Route path="vehiculos/:id" element={<VehiculoPerfilPage />} />
          <Route path="solicitudes-combustible" element={<SolicitudesCombustiblePage />} />
          <Route path="mantenimientos" element={<MantenimientosPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="asignaciones" element={<AsignacionesPage />} />
          <Route path="monitoreo" element={<MonitoreoPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
