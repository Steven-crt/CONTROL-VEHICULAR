import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { activarGraciaPostLogin } from '../api/axios';
import { onUnauthorized, offUnauthorized } from '../api/authEvents';

const AuthContext = createContext(null);

// Roles vigentes: admin y empleado. Valores legacy (operador/cajero, 2/3)
// se mapean a 'empleado' para que sesiones guardadas sigan funcionando.
const normalizeRol = (rol) => {
  const r = String(rol ?? '').toLowerCase();
  if (r === '1' || r === 'admin') return 'admin';
  if (r === '2' || r === '3' || r === '4' || r === 'operador' || r === 'cajero' || r === 'empleado') return 'empleado';
  return r;
};

const normalizeUsuario = (u) => (u ? { ...u, rol: normalizeRol(u.rol) } : u);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Sin token en localStorage: la sesión vive en cookie httpOnly.
  // Limpiar restos legacy de versiones anteriores que guardaban el JWT.
  useEffect(() => {
    try { localStorage.removeItem('token'); } catch {}
    // Intentar restaurar sesión desde cookie httpOnly vía /auth/me
    api.get('/auth/me').then(({ data }) => {
      setUsuario(normalizeUsuario(data));
      // Activar gracia post-restauración: al recargar la página, los componentes
      // que se montan inmediatamente disparan peticiones API. Si alguna falla 401
      // de forma transitoria (cold-start, race), no debe provocar redirect a login.
      activarGraciaPostLogin();
    }).catch(() => {
      setUsuario(null);
    }).finally(() => setLoading(false));
  }, []);

  // Escuchar evento 401 del interceptor de axios.
  // Al recibir 401: limpiar usuario y navegar a /login con React Router
  // (SIN window.location.href → sin recarga de página → se rompe el loop).
  const handleUnauthorized = useCallback(() => {
    setUsuario(null);
    try { localStorage.removeItem('usuario'); localStorage.removeItem('token'); } catch {}
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    onUnauthorized(handleUnauthorized);
    return () => offUnauthorized(handleUnauthorized);
  }, [handleUnauthorized]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    const usuarioNorm = normalizeUsuario(data.usuario);
    // Token en cookie httpOnly — no se persiste en localStorage (XSS).
    try { localStorage.setItem('usuario', JSON.stringify(usuarioNorm)); } catch {}
    setUsuario(usuarioNorm);
    // Activar período de gracia: las llamadas API que se disparen
    // inmediatamente (configuración, notificaciones, etc.) no deben
    // provocar redirect a /login si fallan 401 transitoriamente.
    activarGraciaPostLogin();
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // La cookie puede no existir: se limpia igual
    }
    try { localStorage.removeItem('usuario'); localStorage.removeItem('token'); } catch {}
    setUsuario(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
