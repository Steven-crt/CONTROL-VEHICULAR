import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, Car, MapPin, Fuel, Calendar, Gauge, Filter, ChevronDown, ChevronUp, AlertCircle, CalendarDays, Plus, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_VEHICULO = { placa: '', tipo: 'auto', color: '', marca: '', modelo: '', anio: '' };

export default function Vehiculos() {
  const navigate = useNavigate();
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [vehForm, setVehForm] = useState(EMPTY_VEHICULO);
  const [saving, setSaving] = useState(false);

  const fetchVehiculos = async (year, query) => {
    try {
      setLoading(true);
      const params = {};
      if (query) params.search = query;
      if (year) params.year = year;
      const { data } = await api.get('/vehiculos', { params });
      setVehiculos(data);
    } catch (err) {
      toast.error('Error al cargar vehículos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVehiculos(yearFilter, search);
  };

  const handleClear = () => {
    setSearch('');
    setYearFilter('');
    fetchVehiculos();
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!vehForm.placa.trim()) return toast.error('La placa es requerida');
    setSaving(true);
    try {
      await api.post('/vehiculos', vehForm);
      toast.success('Vehículo registrado');
      setShowModal(false);
      setVehForm(EMPTY_VEHICULO);
      fetchVehiculos(yearFilter, search);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar');
    } finally { setSaving(false); }
  };

  const getStatusColor = (vehiculo) => {
    const km = vehiculo.km_actual || 0;
    if (km > 100000) return 'text-red-400 bg-red-900/20 border-red-700/50';
    if (km > 50000) return 'text-amber-400 bg-amber-900/20 border-amber-700/50';
    return 'text-emerald-400 bg-emerald-900/20 border-emerald-700/50';
  };

  const getUbicacionTexto = (ubicacion) => {
    if (!ubicacion) return 'Sin ubicación';
    return `${ubicacion.latitud.toFixed(4)}, ${ubicacion.longitud.toFixed(4)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Car className="w-7 h-7 text-park-accent" />
            Gestión de Vehículos
          </h1>
          <p className="text-park-muted text-sm mt-1">Busque y administre la información de la flota</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-park-muted text-sm">
            <span className="text-park-accent font-medium">{vehiculos.length}</span> vehículo{vehiculos.length !== 1 ? 's' : ''}
          </p>
          <button onClick={() => { setVehForm(EMPTY_VEHICULO); setShowModal(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Vehículo
          </button>
        </div>
      </div>

      {/* Formulario de búsqueda */}
      <form onSubmit={handleSearch} className="card">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-park-accent" />
          <span className="text-white font-semibold text-sm">Filtros de búsqueda</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-44">
            <label className="text-park-muted text-xs font-medium mb-1.5 block">
              Año del Vehículo
            </label>
            <input
              type="number"
              placeholder="Ej: 2022"
              className="input"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              min={2000}
              max={2030}
            />
          </div>
          <div className="flex-1">
            <label className="text-park-muted text-xs font-medium mb-1.5 block">Texto de búsqueda (opcional)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-park-muted" />
              <input
                type="text"
                placeholder="Buscar por placa, marca o modelo..."
                className="input pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <button type="submit" className="btn-primary">
              <Search className="w-4 h-4" />
              Buscar
            </button>
            {(search || yearFilter) && (
              <button type="button" onClick={handleClear} className="btn-secondary">
                Limpiar
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Resultados */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="text-park-accent animate-pulse font-medium text-lg">Buscando vehículos...</div>
        </div>
      ) : vehiculos.length === 0 ? (
        <div className="card text-center py-16">
          <Car className="w-16 h-16 mx-auto text-park-muted/30 mb-4" />
          <p className="text-park-muted text-lg font-medium">No se encontraron vehículos</p>
          <p className="text-park-muted text-sm mt-1">Intente con otros criterios de búsqueda</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="text-park-muted text-sm font-medium">
            {vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''} encontrado{vehiculos.length !== 1 ? 's' : ''}
          </p>
          {vehiculos.map((vehiculo) => (
            <div
              key={vehiculo.id}
              className="card hover:border-park-accent/30 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate(`/vehiculos/${vehiculo.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Icono */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-park-accent/20 to-park-accent/5 flex items-center justify-center shrink-0 border border-park-accent/20">
                    <Car className="w-7 h-7 text-park-accent" />
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="text-white font-bold text-lg tracking-wide">
                        {vehiculo.placa}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehiculo)}`}>
                        <Gauge className="w-3 h-3 mr-1" />
                        {vehiculo.km_actual?.toLocaleString() || 0} km
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                      <span className="text-park-muted">
                        <span className="text-slate-400">Marca:</span>{' '}
                        <span className="text-white font-medium">{vehiculo.marca || 'N/A'}</span>
                      </span>
                      <span className="text-park-muted">
                        <span className="text-slate-400">Modelo:</span>{' '}
                        <span className="text-white font-medium">{vehiculo.modelo || 'N/A'}</span>
                      </span>
                      <span className="text-park-muted">
                        <span className="text-slate-400">Año:</span>{' '}
                        <span className="text-white font-medium">{vehiculo.anio || 'N/A'}</span>
                      </span>
                      <span className="text-park-muted">
                        <span className="text-slate-400">Color:</span>{' '}
                        <span className="text-white font-medium capitalize">{vehiculo.color || 'N/A'}</span>
                      </span>
                      <span className="text-park-muted">
                        <span className="text-slate-400">Tipo:</span>{' '}
                        <span className="text-white font-medium capitalize">{vehiculo.tipo}</span>
                      </span>
                    </div>

                    {/* Ubicación y estado */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className={`w-3.5 h-3.5 ${vehiculo.ultima_ubicacion ? 'text-emerald-400' : 'text-park-muted'}`} />
                        <span className={vehiculo.ultima_ubicacion ? 'text-slate-300' : 'text-park-muted'}>
                          {getUbicacionTexto(vehiculo.ultima_ubicacion)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Fuel className="w-3.5 h-3.5 text-park-muted" />
                        <span className="text-park-muted">
                          {vehiculo.ultima_carga_fecha
                            ? `Última carga: ${new Date(vehiculo.ultima_carga_fecha).toLocaleDateString('es')}`
                            : 'Sin cargas registradas'}
                        </span>
                      </div>
                    </div>

                    {vehiculo.cliente_nombre && (
                      <p className="text-xs text-park-muted mt-2">
                        <span className="text-slate-500">Propietario:</span>{' '}
                        <span className="text-slate-300 font-medium">{vehiculo.cliente_nombre}</span>
                        {vehiculo.cliente_telefono && (
                          <span className="text-slate-500 ml-2">• {vehiculo.cliente_telefono}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRightIcon className="w-5 h-5 text-park-muted group-hover:text-park-accent transition-colors shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal Nuevo Vehículo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full animate-slide-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-park-text font-semibold flex items-center gap-2">
                <Car className="w-5 h-5 text-park-accent" /> Nuevo Vehículo
              </h3>
              <button onClick={() => setShowModal(false)} className="text-park-muted hover:text-park-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveVehicle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-park-muted text-sm mb-1">Placa *</label><input className="input" value={vehForm.placa} onChange={e => setVehForm({ ...vehForm, placa: e.target.value })} required placeholder="Ej: ABC123" /></div>
                <div><label className="block text-park-muted text-sm mb-1">Tipo</label>
                  <select className="select" value={vehForm.tipo} onChange={e => setVehForm({ ...vehForm, tipo: e.target.value })}>
                    <option value="auto">Auto</option>
                    <option value="moto">Moto</option>
                    <option value="discapacitado">Discapacitado</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div><label className="block text-park-muted text-sm mb-1">Marca</label><input className="input" value={vehForm.marca} onChange={e => setVehForm({ ...vehForm, marca: e.target.value })} placeholder="Ej: Toyota" /></div>
                <div><label className="block text-park-muted text-sm mb-1">Modelo</label><input className="input" value={vehForm.modelo} onChange={e => setVehForm({ ...vehForm, modelo: e.target.value })} placeholder="Ej: Corolla" /></div>
                <div><label className="block text-park-muted text-sm mb-1">Año</label><input type="number" className="input" value={vehForm.anio} onChange={e => setVehForm({ ...vehForm, anio: e.target.value })} placeholder="Ej: 2023" min={1900} max={2030} /></div>
                <div><label className="block text-park-muted text-sm mb-1">Color</label><input className="input" value={vehForm.color} onChange={e => setVehForm({ ...vehForm, color: e.target.value })} placeholder="Ej: Rojo" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
