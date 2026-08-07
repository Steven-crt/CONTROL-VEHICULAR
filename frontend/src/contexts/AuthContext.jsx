import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const normalizeRol = (rol) => {
  const r = String(rol ?? '').toLowerCase();
  if (r === '1' || r === 'admin') return 'admin';
  if (r === '2' || r === 'operador') return 'operador';
  if (r === '3' || r === 'cajero') return 'cajero';
  return r;
};

const normalizeUsuario = (u) => (u ? { ...u, rol: normalizeRol(u.rol) } : u);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    if (saved && token) {
      setUsuario(normalizeUsuario(JSON.parse(saved)));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    const usuario = normalizeUsuario(data.usuario);
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
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
