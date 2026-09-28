import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehiculos   from './pages/Vehiculos';
import VehiculoDetalle from './pages/VehiculoDetalle';
import Movimiento from './pages/Movimiento';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Configuracion from './pages/Configuracion';
import Anomalias from './pages/Anomalias';
import Historia from './pages/Historia';

function PrivateRoute({ children }) {
  const { usuario, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-cv-dark flex items-center justify-center">
      <div className="text-cv-accent text-xl animate-pulse">Cargando...</div>
    </div>
  );
  return usuario ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { usuario } = useAuth();
  if (!usuario || usuario.rol !== 'admin') return <Navigate to="/vehiculos" replace />;
  return children;
}

function AppRoutes() {
  const { usuario } = useAuth();
  if (!usuario) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
  return (
    <Routes>
      // Rutas privadas: si no hay usuario loguean 
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to={usuario?.rol === 'admin' ? '/dashboard' : '/vehiculos'} />} />
        <Route path="dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="vehiculos" element={<Vehiculos />} />
        <Route path="vehiculos/:id" element={<VehiculoDetalle />} />
        <Route path="historia" element={<Historia />} />
        <Route path="anomalias" element={<Anomalias />} />
        <Route path="movimiento" element={<AdminRoute><Movimiento /></AdminRoute>} />
        <Route path="reportes" element={<AdminRoute><Reportes /></AdminRoute>} />
        <Route path="usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
        <Route path="configuracion" element={<AdminRoute><Configuracion /></AdminRoute>} />
      </Route>
      <Route path="/login" element={<Navigate to={usuario?.rol === 'admin' ? '/dashboard' : '/vehiculos'} />} />
      <Route path="*" element={<Navigate to={usuario?.rol === 'admin' ? '/dashboard' : '/vehiculos'} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ConfigProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#132040', color: '#e2e8f0', border: '1px solid #1e3a5f' },
                success: { iconTheme: { primary: '#10b981', secondary: '#132040' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#132040' } },
              }}
            />
            <AppRoutes />
          </ConfigProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
