import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useConfig } from '../contexts/ConfigContext';
import { Car, Eye, EyeOff } from 'lucide-react';
import styled from 'styled-components';
import Loader from '../components/Loader';

export default function Login() {
  const { config } = useConfig();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('¡Bienvenido al sistema!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledWrapper>
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
                <p className="subtitle">Ingresa tus credenciales para iniciar sesión.</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Usuario"
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

              <div className="demo-section">
                <p className="demo-label">Credenciales de prueba:</p>
                <button
                  type="button"
                  className="demo-btn"
                  onClick={() => setForm({ username: 'admin', password: 'password' })}
                >
                  <span className="demo-btn-title">Admin</span>
                  <span className="demo-btn-sub">admin / password</span>
                </button>
              </div>

              <p className="footer-text">
                © 2025 {config?.nombre_negocio || 'Control Vehicular'}. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .login-wrapper,
  .login-wrapper * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
      Arial, sans-serif;
  }

  .login-wrapper {
    --blob-1-color: #f59e0b;
    --blob-2-color: #3b82f6;
    --btn-hover-glow: rgba(245, 158, 11, 0.25);
    --input-focus-glow: rgba(245, 158, 11, 0.12);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: #0b1220;
    position: relative;
    overflow: hidden;
    animation: floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(30px);
  }

  @keyframes floatUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .login-card {
    position: relative;
    width: 360px;
    background-color: #132040;
    border-radius: 24px;
    padding: 36px 28px;
    overflow: hidden;
    box-shadow:
      0 24px 48px rgba(0, 0, 0, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.1);
    transition:
      transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .login-wrapper:hover .login-card {
    transform: translateY(-6px);
    box-shadow:
      0 32px 64px rgba(0, 0, 0, 0.3),
      0 12px 24px rgba(0, 0, 0, 0.15);
  }

  .glow-blob {
    position: absolute;
    filter: blur(45px);
    border-radius: 50%;
    z-index: 0;
    opacity: 0.6;
    animation: pulseGlow 4s infinite alternate ease-in-out;
    transition:
      opacity 0.5s ease,
      filter 0.5s ease;
  }

  .login-wrapper:hover .glow-blob {
    opacity: 0.75;
    filter: blur(40px);
  }

  .blob-1 {
    top: -30px;
    right: -30px;
    width: 170px;
    height: 170px;
    background: var(--blob-1-color);
  }

  .blob-2 {
    bottom: -50px;
    left: -50px;
    width: 210px;
    height: 210px;
    background: var(--blob-2-color);
    animation-delay: -2s;
  }

  @keyframes pulseGlow {
    0% {
      transform: scale(0.9);
      opacity: 0.5;
    }
    100% {
      transform: scale(1.1);
      opacity: 0.7;
    }
  }

  .dark-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(5, 5, 8, 0.85) 30%,
      transparent 100%
    );
    z-index: 1;
    box-shadow: inset 0 0 0 1px rgba(30, 58, 95, 0.4);
    border-radius: inherit;
  }

  .view-container {
    position: relative;
    z-index: 10;
  }

  .form-view {
    display: flex;
    flex-direction: column;
    animation: fadeInView 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeInView {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .header {
    margin-bottom: 28px;
    text-align: center;
  }

  .logo-container {
    width: 60px;
    height: 60px;
    margin: 0 auto 16px auto;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    background: rgba(245, 158, 11, 0.08);
  }

  .logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .logo-icon {
    width: 30px;
    height: 30px;
    color: #f59e0b;
  }

  .title {
    color: #ffffff;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    font-weight: 400;
  }

  .input-group {
    margin-bottom: 16px;
    position: relative;
  }

  .input-field {
    width: 100%;
    padding: 1.05em 1.2em;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    color: #ffffff;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .input-field::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .input-field:focus {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 20px var(--input-focus-glow);
    transform: translateY(-2px);
  }

  .password-group .input-field {
    padding-right: 44px;
  }

  .toggle-pass {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 4px;
    display: flex;
    transition: color 0.2s;
  }

  .toggle-pass:hover {
    color: rgba(255, 255, 255, 0.8);
  }

  .btn-submit {
    width: 100%;
    padding: 1em;
    background: #f59e0b;
    color: #0b1220;
    border: none;
    border-radius: 12px;
    font-size: 14.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .btn-submit:hover {
    background: #fbbf24;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px var(--btn-hover-glow);
  }

  .btn-submit:active {
    transform: translateY(0);
  }

  .loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
    gap: 8px;
  }

  .loader-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
  }

  .demo-section {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    text-align: center;
  }

  .demo-label {
    color: rgba(255, 255, 255, 0.4);
    font-size: 12px;
    margin-bottom: 10px;
  }

  .demo-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 10px 20px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .demo-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  .demo-btn-title {
    color: #f59e0b;
    font-size: 13px;
    font-weight: 500;
  }

  .demo-btn-sub {
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
  }

  .footer-text {
    margin-top: 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.3);
    font-size: 11px;
  }
`;
