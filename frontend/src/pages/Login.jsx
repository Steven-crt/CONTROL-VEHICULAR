import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useConfig } from '../contexts/ConfigContext';
import { Car, Lock, User, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-park-darker flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-park-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-park-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-park-border/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="bg-park-card border border-park-border rounded-2xl p-8 shadow-2xl shadow-black/50 backdrop-blur-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-park-accent to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/30 mb-4 overflow-hidden">
              {config?.logo_url ? (
                <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Car className="w-10 h-10 text-park-dark" />
              )}
            </div>
            <h1 className="text-park-text font-bold text-2xl tracking-tight text-center">{config?.nombre_negocio || 'Control Vehicular'}</h1>
            <p className="text-park-muted text-sm mt-1 text-center">Sistema de Control Vehicular</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div> 
              <label   className="block text-park-muted text-sm font-medium mb-1.5">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-park-muted" />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="input pl-9"
                  placeholder="Ingresa tu usuario"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-park-muted text-sm font-medium mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-park-muted" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input pl-9 pr-10"
                  placeholder="Ingresa tu contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-park-muted hover:text-park-text transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-6"
            >
              {loading ? (
                <span className="animate-pulse">Verificando...</span>
              ) : (
                <>  
                  <Lock className="w-4 h-4" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-park-border/50">
            <p className="text-park-muted text-xs text-center mb-3">Credenciales de prueba:</p>
            <div className="flex justify-center text-xs">
              <button
                onClick={() => setForm({ username: 'admin', password: 'password' })}
                className="bg-park-sidebar hover:bg-park-border/50 rounded-lg p-2 text-center transition-colors w-32"
              >
                <div className="font-semibold text-park-accent">Admin</div>
                <div className="text-park-muted">admin</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-park-muted text-xs mt-4">
          © 2025 Sistema de Control Vehicular. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
