import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

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

  // Sin sesión persistente: al abrir/recargar la app SIEMPRE se muestra la
  // pantalla de Login y el usuario debe colocar sus credenciales. Se limpia
  // cualquier resto de sesión previa (token/usuario en localStorage).
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    setLoading(false);
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