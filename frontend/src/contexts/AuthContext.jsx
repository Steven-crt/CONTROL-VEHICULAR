import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { activarGraciaPostLogin } from '../api/axios';
import { onUnauthorized, offUnauthorized } from '../api/authEvents';
import { iniciarRealTime, detenerRealTime } from '../api/realtime';

const AuthContext = createContext(null);

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

  useEffect(() => {
    try { localStorage.removeItem('token'); } catch { /* opcional: limpieza legacy, puede no existir */ }
    api.get('/auth/me').then(({ data }) => {
      setUsuario(normalizeUsuario(data));

      activarGraciaPostLogin();
    }).catch(() => {
      setUsuario(null);
    }).finally(() => setLoading(false));
  }, []);

  const handleUnauthorized = useCallback(() => {
    setUsuario(null);
    try { localStorage.removeItem('usuario'); localStorage.removeItem('token'); } catch { /* opcional: limpieza legacy, puede no existir */ }
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    onUnauthorized(handleUnauthorized);
    return () => offUnauthorized(handleUnauthorized);
  }, [handleUnauthorized]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });

    if (data?.requiere2FA) {
      return { requiere2FA: true, firma2FA: data.firma2FA, usuario: normalizeUsuario(data.usuario) };
    }
    const usuarioNorm = normalizeUsuario(data.usuario);
    try { localStorage.setItem('usuario', JSON.stringify(usuarioNorm)); } catch { /* opcional: localStorage puede no estar disponible */ }
    setUsuario(usuarioNorm);
    activarGraciaPostLogin();
    return data;
  };

  const verify2FA = async (firma2FA, codigo) => {
    const { data } = await api.post('/auth/2fa/verify', { firma2FA, codigo });
    const usuarioNorm = normalizeUsuario(data.usuario);
    try { localStorage.setItem('usuario', JSON.stringify(usuarioNorm)); } catch { /* opcional: localStorage puede no estar disponible */ }
    setUsuario(usuarioNorm);
    activarGraciaPostLogin();
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
    }
    try { localStorage.removeItem('usuario'); localStorage.removeItem('token'); } catch { /* opcional: limpieza legacy, puede no existir */ }
    setUsuario(null);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (usuario) {
      iniciarRealTime();
    } else {
      detenerRealTime();
    }
    return () => detenerRealTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [!!usuario]);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, verify2FA, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
