import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { useConfig } from '../contexts/ConfigContext';
import { Car, Eye, EyeOff } from 'lucide-react';
import styled from 'styled-components';
import Loader from '../components/Loader';
import DottedSurface from '../components/ui/DottedSurface';

export default function Login() {
  const { config } = useConfig();
  const { theme } = useTheme();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, password);
      toast.success('¡Listo! Bienvenido.');
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        toast.error('No se pudo conectar con el servidor. Verifica que esté activo.');
      } else {
        toast.error(err.response?.data?.error || 'Credenciales inválidas');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledWrapper>
      {/* Fondo animado con DottedSurface */}
      <DottedSurface size={6} opacity={0.6} />
      
      <div className="login-wrapper">
        <div className="login-card">
          <div className="glow-blob blob-1" />
          <div className="glow-blob blob-2" />
          <div className="dark-overlay" />
          <div className="view-container">
            <div className="form-view">
              <div className="header">
                <div className="logo-container">
                  {config?.logo_url ? (
                    <img src={config.logo_url} alt="Logo" className="logo-img" />
                  ) : (
                    <Car className="logo-icon" />
                  )}
                </div>
                <div className="title">{config?.nombre_negocio || 'Control Vehicular'}</div>
                <p className="subtitle">Ingresa para gestionar tu flota.</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nombre de usuario"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="input-group password-group">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Contraseña"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {loading ? (
                  <div className="loader-container">
                    <Loader />
                    <span className="loader-text">Verificando...</span>
                  </div>
                ) : (
                  <button type="submit" className="btn-submit">Iniciar Sesión</button>
                )}
              </form>

              <p className="footer-text">
                © {new Date().getFullYear()} {config?.nombre_negocio || 'Control Vehicular'}. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}
