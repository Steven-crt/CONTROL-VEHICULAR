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

  // Restauración de sesión:
  // Si no hay token en localStorage ni usuario guardado, no hay sesión que
  // restaurar: se omite la llamada a /auth/me para evitar el 401 innecesario
  // en consola del navegador (el 401 es "correcto" pero ruidoso en DevTools).
  // Si hay token, se valida con /auth/me (puede ser cookie httpOnly o fallback).
  useEffect(() => {
    const restaurar = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.removeItem('usuario');
        setUsuario(null);
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUsuario(normalizeUsuario(data));
        localStorage.setItem('usuario', JSON.stringify(normalizeUsuario(data)));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setUsuario(null);
      } finally {
        setLoading(false);
      }
    };
    restaurar();
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    const usuarioNorm = normalizeUsuario(data.usuario);
    // El token viaja en cookie httpOnly (protegido contra XSS).
    // Se conserva también en localStorage solo como fallback de compatibilidad.
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(usuarioNorm));
    setUsuario(usuarioNorm);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // La cookie puede no existir: se limpia igual
    }
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