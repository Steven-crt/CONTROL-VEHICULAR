import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Save, Settings, UploadCloud } from 'lucide-react';

const CAMPOS = [
  { key: 'nombre_negocio', label: 'Nombre del Negocio', type: 'text', placeholder: 'ParkSmart Pro' },
  { key: 'ruc', label: 'RUC / ID Fiscal', type: 'text', placeholder: '1234567890001' },
  { key: 'direccion', label: 'Dirección', type: 'text', placeholder: 'Av. Principal 123' },
  { key: 'telefono', label: 'Teléfono', type: 'text', placeholder: '0999999999' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'info@parqueo.com' },
  { key: 'capacidad_total', label: 'Capacidad Total (espacios)', type: 'number', placeholder: '50' },
  { key: 'tiempo_gracia', label: 'Tiempo de Gracia (minutos)', type: 'number', placeholder: '10' },
  { key: 'moneda', label: 'Moneda (Símbolo)', type: 'text', placeholder: 'USD / S/' },
  { key: 'logo_url', label: 'URL del Logo', type: 'text', placeholder: 'https://ejemplo.com/logo.png' },
];

import { useConfig } from '../contexts/ConfigContext';

export default function Configuracion() {
  const { config: globalConfig, refreshConfig } = useConfig();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setConfig(globalConfig || {});
  }, [globalConfig]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('logo', file);
    
    setLoading(true);
    try {
      const { data } = await api.post('/upload/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setConfig({ ...config, logo_url: data.url });
      toast.success('Imagen subida temporalmente. Clic en "Guardar Configuración" para aplicar.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir imagen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/configuracion', config);
      await refreshConfig();
      toast.success('✅ Configuración guardada correctamente');
    } catch (err) {
      toast.error('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-park-accent/10 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-park-accent" />
          </div>
          <div>
            <h2 className="text-park-text font-semibold">Configuración General</h2>
            <p className="text-park-muted text-xs">Parámetros del sistema de parqueo</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <h3 className="text-park-muted text-xs font-semibold uppercase tracking-wider border-b border-park-border pb-2">Datos del Negocio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CAMPOS.map(({ key, label, type, placeholder }) => (
              <div key={key} className={key === 'nombre_negocio' || key === 'direccion' || key === 'logo_url' ? 'sm:col-span-2' : ''}>
                <label className="block text-park-muted text-sm font-medium mb-1.5">{label}</label>
                {key === 'logo_url' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder={placeholder}
                      value={config[key] || ''}
                      onChange={e => setConfig({ ...config, [key]: e.target.value })}
                    />
                    <label className={`btn-secondary cursor-pointer flex items-center justify-center whitespace-nowrap min-w-[140px] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      Subir Logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
                    </label>
                  </div>
                ) : (
                  <input
                    type={type}
                    className="input"
                    placeholder={placeholder}
                    value={config[key] || ''}
                    onChange={e => setConfig({ ...config, [key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-park-border pt-4">
            <h3 className="text-park-muted text-xs font-semibold uppercase tracking-wider pb-4">Información del Sistema</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-park-muted">
              {[
                ['Versión', 'ParkSmart Pro v1.0'],
                ['Backend', 'Node.js + Express'],
                ['Base de Datos', 'MySQL 8.x'],
                ['Frontend', 'React 18 + Vite'],
              ].map(([k, v]) => (
                <div key={k} className="bg-park-sidebar rounded-lg px-3 py-2 flex justify-between">
                  <span>{k}</span>
                  <span className="text-park-text font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </form>
      </div>
    </div>
  );
}
