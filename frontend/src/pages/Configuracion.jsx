import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Save, Settings, UploadCloud, Truck, Shield, Fuel, Wrench } from 'lucide-react';

const CAMPOS_NEGOCIO = [
  { key: 'nombre_negocio', label: 'Nombre de la Empresa', type: 'text', placeholder: 'Mi Empresa de Flota' },
  { key: 'ruc', label: 'RUC / ID Fiscal', type: 'text', placeholder: '1234567890001' },
  { key: 'direccion', label: 'Dirección', type: 'text', placeholder: 'Av. Principal 123' },
  { key: 'telefono', label: 'Teléfono', type: 'text', placeholder: '0999999999' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'info@miflota.com' },
  { key: 'moneda', label: 'Moneda (Símbolo)', type: 'text', placeholder: 'USD / S/' },
  { key: 'logo_url', label: 'URL del Logo', type: 'text', placeholder: 'https://ejemplo.com/logo.png' },
];

const CAMPOS_FLOTA = [
  { key: 'total_vehiculos', label: 'Total de Vehículos en Flota', type: 'number', placeholder: '30' },
  { key: 'formato_placa', label: 'Formato de Placa', type: 'text', placeholder: 'ABC-1234' },
  { key: 'tipos_vehiculo', label: 'Tipos de Vehículo Permitidos', type: 'text', placeholder: 'Auto, Moto, Camioneta' },
];

const CAMPOS_MANTENIMIENTO = [
  { key: 'intervalo_mant_km', label: 'Intervalo Mantenimiento (km)', type: 'number', placeholder: '5000' },
  { key: 'intervalo_mant_dias', label: 'Intervalo Mantenimiento (días)', type: 'number', placeholder: '90' },
  { key: 'alerta_combustible', label: 'Alerta Combustible (kmrestantes)', type: 'number', placeholder: '50' },
];

const CAMPOS_SEGURIDAD = [
  { key: 'monitoreo_gps', label: 'Monitoreo GPS', type: 'select', options: ['Activo', 'Inactivo'] },
  { key: 'alertas_vencimiento', label: 'Alertas de Vencimiento Documentos', type: 'select', options: ['Activas', 'Inactivas'] },
];

import { useConfig } from '../contexts/ConfigContext';

function CampoForm({ campo, config, setConfig, children }) {
  const { key, label, type, placeholder, options } = campo;
  const isWide = ['nombre_negocio', 'direccion', 'logo_url', 'tipos_vehiculo'].includes(key);
  return (
    <div className={isWide ? 'sm:col-span-2' : ''}>
      <label className="block text-park-muted text-sm font-medium mb-1.5">{label}</label>
      {children || (
        type === 'select' ? (
          <select
            className="select"
            value={config[key] || options[0]}
            onChange={e => setConfig({ ...config, [key]: e.target.value })}
          >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type}
            className="input"
            placeholder={placeholder}
            value={config[key] || ''}
            onChange={e => setConfig({ ...config, [key]: e.target.value })}
          />
        )
      )}
    </div>
  );
}

function Seccion({ icon: Icon, titulo, subtitulo, campos, config, setConfig, loading, handleFileUpload }) {
  return (
    <div className="border-t border-park-border pt-4">
      <div className="flex items-center gap-2 pb-4">
        <Icon className="w-4 h-4 text-park-accent" />
        <h3 className="text-park-muted text-xs font-semibold uppercase tracking-wider">{titulo}</h3>
        {subtitulo && <span className="text-park-muted/50 text-xs">— {subtitulo}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {campos.map(campo => (
          <CampoForm key={campo.key} campo={campo} config={config} setConfig={setConfig}>
            {campo.key === 'logo_url' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder={campo.placeholder}
                  value={config[campo.key] || ''}
                  onChange={e => setConfig({ ...config, [campo.key]: e.target.value })}
                />
                <label className={`btn-secondary cursor-pointer flex items-center justify-center whitespace-nowrap min-w-[140px] ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Subir Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
                </label>
              </div>
            )}
          </CampoForm>
        ))}
      </div>
    </div>
  );
}

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
      toast.success('Imagen subida. Clic en "Guardar" para aplicar.');
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
      toast.success('Configuración guardada correctamente');
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
            <h2 className="text-park-text font-semibold">Configuración del Sistema</h2>
            <p className="text-park-muted text-xs">Parámetros del sistema de control vehicular</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <Seccion icon={Settings} titulo="Datos de la Empresa" campos={CAMPOS_NEGOCIO} config={config} setConfig={setConfig} loading={loading} handleFileUpload={handleFileUpload} />
          <Seccion icon={Truck} titulo="Flota Vehicular" subtitulo="parámetros de la flota" campos={CAMPOS_FLOTA} config={config} setConfig={setConfig} loading={loading} />
          <Seccion icon={Wrench} titulo="Mantenimiento" subtitulo="alertas preventivas" campos={CAMPOS_MANTENIMIENTO} config={config} setConfig={setConfig} loading={loading} />
          <Seccion icon={Shield} titulo="Seguridad y Monitoreo" campos={CAMPOS_SEGURIDAD} config={config} setConfig={setConfig} loading={loading} />

          <div className="border-t border-park-border pt-4">
            <h3 className="text-park-muted text-xs font-semibold uppercase tracking-wider pb-4">Información del Sistema</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-park-muted">
              {[
                ['Versión', 'Control Vehicular v1.0'],
                ['Backend', 'Node.js + Express'],
                ['Base de Datos', 'MySQL 8.x'],
                ['Frontend', 'React 19 + Vite'],
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
