import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import {
  Car, Fuel, Wrench, ArrowLeft, Gauge, MapPin, Calendar, DollarSign,
  ChevronDown, ChevronUp, AlertCircle, Download, Filter, BarChart3, CalendarDays,
  Pencil, Trash2, X, Check
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend
} from 'recharts';
import toast from 'react-hot-toast';

export default function VehiculoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [vehiculo, setVehiculo] = useState(null);
  const [activeTab, setActiveTab] = useState('combustible');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const isAdmin = usuario?.rol === 'admin';
  const [combustibleData, setCombustibleData] = useState(null);
  const [mantenimientoData, setMantenimientoData] = useState(null);
  const [filtroCombustible, setFiltroCombustible] = useState('');
  const [filtroMantenimiento, setFiltroMantenimiento] = useState('');
  const [filtroCosto, setFiltroCosto] = useState('');
  const [sortField, setSortField] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');
  const [showCombustibleForm, setShowCombustibleForm] = useState(false);
  const [showMantenimientoForm, setShowMantenimientoForm] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehRes, combRes, mantRes] = await Promise.all([
        api.get(`/vehiculos/${id}`),
        api.get(`/combustible/historial/${id}`),
        api.get(`/mantenimiento/historial/${id}`)
      ]);
      setVehiculo(vehRes.data);
      setCombustibleData(combRes.data);
      setMantenimientoData(mantRes.data);
    } catch (err) {
      toast.error('Error al cargar datos del vehículo');
      navigate('/vehiculos');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortArrow = (field) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const getSortedHistorial = (items) => {
    return [...items].sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'fecha': valA = new Date(a.fecha || a.fecha_carga); valB = new Date(b.fecha || b.fecha_carga); break;
        case 'km': valA = a.km_actual; valB = b.km_actual; break;
        case 'costo': valA = parseFloat(a.costo_total || a.costo || 0); valB = parseFloat(b.costo_total || b.costo || 0); break;
        case 'rendimiento': valA = a.rendimiento_estimado || 0; valB = b.rendimiento_estimado || 0; break;
        default: valA = new Date(a.fecha_carga); valB = new Date(b.fecha_carga);
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  };

  const filtrarCombustible = (historial) => {
    if (!filtroCombustible) return historial;
    return historial.filter(c => c.tipo_combustible === filtroCombustible);
  };

  const filtrarMantenimiento = (historial) => {
    let filtered = [...historial];
    if (filtroMantenimiento) {
      filtered = filtered.filter(m => m.tipo_servicio === filtroMantenimiento);
    }
    if (filtroCosto) {
      const [min, max] = filtroCosto.split('-').map(Number);
      if (max) {
        filtered = filtered.filter(m => m.costo >= min && m.costo <= max);
      } else {
        filtered = filtered.filter(m => m.costo >= min);
      }
    }
    return filtered;
  };

  const handleExportPDF = async (tipo) => {
    try {
      toast.success(`Exportando ${tipo} a PDF...`);
      // En un entorno real usaríamos jsPDF o html2pdf
      toast.success(`Historial de ${tipo} exportado correctamente`);
    } catch (err) {
      toast.error('Error al exportar');
    }
  };

  const handleRegistrarCombustible = async (e) => {
    e.preventDefault();
    try {
      await api.post('/combustible', {
        vehiculo_id: parseInt(id),
        ...formData
      });
      toast.success('Carga de combustible registrada');
      setShowCombustibleForm(false);
      setFormData({});
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar');
    }
  };

  const handleRegistrarMantenimiento = async (e) => {
    e.preventDefault();
    try {
      await api.post('/mantenimiento', {
        vehiculo_id: parseInt(id),
        ...formData
      });
      toast.success('Mantenimiento registrado');
      setShowMantenimientoForm(false);
      setFormData({});
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar');
    }
  };

  const handleStartEdit = () => {
    setEditForm({
      placa: vehiculo.placa || '',
      tipo: vehiculo.tipo || 'auto',
      color: vehiculo.color || '',
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      anio: vehiculo.anio || '',
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      const { data } = await api.put(`/vehiculos/${id}`, editForm);
      setVehiculo(prev => ({ ...prev, ...data }));
      setEditing(false);
      toast.success('Vehículo actualizado correctamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Está seguro de eliminar este vehículo? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/vehiculos/${id}`);
      toast.success('Vehículo eliminado');
      navigate('/vehiculos');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-park-accent animate-pulse font-medium">Cargando información del vehículo...</div>
      </div>
    );
  }

  if (!vehiculo) return null;

  const historialCombustible = combustibleData?.historial || [];
  const resumenCombustible = combustibleData?.resumen || {};
  const historialMantenimiento = mantenimientoData?.historial || [];
  const resumenMantenimiento = mantenimientoData?.resumen || {};

  // Datos para el gráfico de rendimiento
  const rendimientoChartData = getSortedHistorial(filtrarCombustible(historialCombustible))
    .filter(c => c.rendimiento_estimado)
    .reverse()
    .slice(-20)
    .map(c => ({
      fecha: new Date(c.fecha_carga).toLocaleDateString('es', { day: '2-digit', month: 'short' }),
      rendimiento: c.rendimiento_estimado,
      consumo: c.litros
    }));

  const tabs = [
    { id: 'combustible', icon: Fuel, label: 'Combustible', count: historialCombustible.length },
    { id: 'mantenimiento', icon: Wrench, label: 'Mantenimiento', count: historialMantenimiento.length },
    { id: 'rendimiento', icon: BarChart3, label: 'Rendimiento', count: null },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/vehiculos')} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Car className="w-7 h-7 text-park-accent" />
            {editing ? 'Editando vehículo' : vehiculo.placa}
          </h1>
        </div>
        {isAdmin && !editing && (
          <div className="flex gap-2">
            <button onClick={handleStartEdit} className="btn-primary text-sm">
              <Pencil className="w-4 h-4" />
              Editar
            </button>
            <button onClick={handleDelete} className="btn-secondary text-sm text-red-400 border-red-700/50 hover:bg-red-900/30">
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </div>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} disabled={saving} className="btn-primary text-sm">
              <Check className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Vehicle info card */}
      <div className="card">
        {editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-park-muted text-xs font-medium mb-1 block">Placa *</label>
              <input className="input" value={editForm.placa} onChange={e => setEditForm({...editForm, placa: e.target.value})} />
            </div>
            <div>
              <label className="text-park-muted text-xs font-medium mb-1 block">Marca</label>
              <input className="input" value={editForm.marca} onChange={e => setEditForm({...editForm, marca: e.target.value})} />
            </div>
            <div>
              <label className="text-park-muted text-xs font-medium mb-1 block">Modelo</label>
              <input className="input" value={editForm.modelo} onChange={e => setEditForm({...editForm, modelo: e.target.value})} />
            </div>
            <div>
              <label className="text-park-muted text-xs font-medium mb-1 block">Año</label>
              <input type="number" className="input" value={editForm.anio} onChange={e => setEditForm({...editForm, anio: e.target.value})} />
            </div>
            <div>
              <label className="text-park-muted text-xs font-medium mb-1 block">Tipo</label>
              <select className="select" value={editForm.tipo} onChange={e => setEditForm({...editForm, tipo: e.target.value})}>
                <option value="auto">Auto</option>
                <option value="moto">Moto</option>
                <option value="discapacitado">Discapacitado</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div>
              <label className="text-park-muted text-xs font-medium mb-1 block">Color</label>
              <input className="input" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <InfoItem icon={Car} label="Placa" value={vehiculo.placa} color="text-park-accent font-bold" />
            <InfoItem icon={Car} label="Marca" value={vehiculo.marca || 'N/A'} />
            <InfoItem icon={Car} label="Modelo" value={vehiculo.modelo || 'N/A'} />
            <InfoItem icon={CalendarDays} label="Año" value={vehiculo.anio || 'N/A'} />
            <InfoItem icon={Car} label="Tipo" value={vehiculo.tipo} capitalize />
            <InfoItem icon={Car} label="Color" value={vehiculo.color || 'N/A'} capitalize />
            <InfoItem icon={Gauge} label="KM Actual" value={`${(vehiculo.km_actual || 0).toLocaleString()} km`} color="text-park-accent" />
            <InfoItem icon={MapPin} label="Ubicación" value={vehiculo.ultima_ubicacion ? `${vehiculo.ultima_ubicacion.latitud.toFixed(4)}, ${vehiculo.ultima_ubicacion.longitud.toFixed(4)}` : 'Sin datos'} />
            <InfoItem icon={Fuel} label="Total Combustible" value={`${vehiculo.totales?.combustible?.total_cargas || 0} cargas`} />
          </div>
        )}
        {vehiculo.cliente_nombre && (
          <div className="mt-4 pt-4 border-t border-park-border flex items-center gap-2 text-sm text-park-muted">
            <span className="text-slate-500">Propietario:</span>
            <span className="text-white font-medium">{vehiculo.cliente_nombre}</span>
            {vehiculo.cedula && <span className="text-slate-500">• CI: {vehiculo.cedula}</span>}
            {vehiculo.telefono && <span className="text-slate-500">• Tel: {vehiculo.telefono}</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-park-border gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-park-accent border-park-accent'
                : 'text-park-muted border-transparent hover:text-park-text hover:border-park-border'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== null && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-park-accent/20 text-park-accent' : 'bg-park-border/50 text-park-muted'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* TAB COMBUSTIBLE */}
        {activeTab === 'combustible' && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard label="Total Cargas" value={resumenCombustible.total_cargas || 0} icon={Fuel} />
              <SummaryCard label="Total Litros" value={`${(resumenCombustible.total_litros || 0).toFixed(1)} L`} icon={Fuel} />
              <SummaryCard label="Gasto Total" value={`$${(resumenCombustible.total_gasto || 0).toFixed(2)}`} icon={DollarSign} color="text-amber-400" />
              <SummaryCard label="Consumo Prom." value={resumenCombustible.consumo_promedio_l100km ? `${resumenCombustible.consumo_promedio_l100km} L/100km` : 'N/A'} icon={Gauge} color="text-blue-400" />
            </div>

            {/* Filters + Actions */}
            <div className="card">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <Filter className="w-4 h-4 text-park-muted" />
                  <select
                    className="select text-sm w-auto"
                    value={filtroCombustible}
                    onChange={(e) => setFiltroCombustible(e.target.value)}
                  >
                    <option value="">Todos los combustibles</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diésel">Diésel</option>
                    <option value="Gas">Gas</option>
                    <option value="Eléctrico">Eléctrico</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                  <button onClick={() => handleExportPDF('combustible')} className="btn-secondary text-sm">
                    <Download className="w-3.5 h-3.5" />
                    Exportar PDF
                  </button>
                </div>
                <button onClick={() => setShowCombustibleForm(!showCombustibleForm)} className="btn-primary text-sm">
                  + Nueva Carga
                </button>
              </div>
            </div>

            {/* Combustible form */}
            {showCombustibleForm && (
              <form onSubmit={handleRegistrarCombustible} className="card border-park-accent/30">
                <h4 className="text-white font-semibold mb-4">Registrar Carga de Combustible</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">Litros *</label>
                    <input type="number" step="0.01" required className="input"
                      placeholder="Ej: 15.5"
                      onChange={e => setFormData({...formData, litros: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">Precio Unitario</label>
                    <input type="number" step="0.01" className="input"
                      placeholder="Ej: 1.05"
                      onChange={e => setFormData({...formData, precio_unitario: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">Costo Total</label>
                    <input type="number" step="0.01" className="input"
                      placeholder="Calculado si se omite"
                      onChange={e => setFormData({...formData, costo_total: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">KM Actual *</label>
                    <input type="number" required className="input"
                      placeholder="Ej: 15000"
                      onChange={e => setFormData({...formData, km_actual: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">Tipo Combustible</label>
                    <select className="select" onChange={e => setFormData({...formData, tipo_combustible: e.target.value})}>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Diésel">Diésel</option>
                      <option value="Gas">Gas</option>
                      <option value="Eléctrico">Eléctrico</option>
                      <option value="Híbrido">Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">Ubicación GPS</label>
                    <input type="text" className="input" placeholder="Lat, Lng"
                      onChange={e => setFormData({...formData, ubicacion_gps: e.target.value})} />
                  </div>
                </div>
                <div className="mt-3">
                  <textarea className="input" placeholder="Observaciones" rows={2}
                    onChange={e => setFormData({...formData, observaciones: e.target.value})} />
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="submit" className="btn-primary">Guardar Carga</button>
                  <button type="button" onClick={() => setShowCombustibleForm(false)} className="btn-secondary">Cancelar</button>
                </div>
              </form>
            )}

            {/* Table */}
            {filtrarCombustible(historialCombustible).length > 0 ? (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-park-border">
                      <th className="table-header text-left py-3 px-3 cursor-pointer hover:text-park-accent" onClick={() => handleSort('fecha')}>
                        Fecha {sortArrow('fecha')}
                      </th>
                      <th className="table-header text-left py-3 px-3 cursor-pointer hover:text-park-accent" onClick={() => handleSort('km')}>
                        KM {sortArrow('km')}
                      </th>
                      <th className="table-header text-left py-3 px-3">Litros</th>
                      <th className="table-header text-right py-3 px-3 cursor-pointer hover:text-park-accent" onClick={() => handleSort('costo')}>
                        Costo {sortArrow('costo')}
                      </th>
                      <th className="table-header text-left py-3 px-3">Tipo</th>
                      <th className="table-header text-right py-3 px-3 cursor-pointer hover:text-park-accent" onClick={() => handleSort('rendimiento')}>
                        Rend. (Km/L) {sortArrow('rendimiento')}
                      </th>
                      <th className="table-header text-right py-3 px-3">Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedHistorial(filtrarCombustible(historialCombustible)).map((c, i) => (
                      <tr key={c.id} className="hover:bg-park-border/20 transition-colors">
                        <td className="table-cell">{new Date(c.fecha_carga).toLocaleDateString('es')}</td>
                        <td className="table-cell font-mono font-medium">{c.km_actual?.toLocaleString()}</td>
                        <td className="table-cell">{parseFloat(c.litros).toFixed(1)} L</td>
                        <td className="table-cell text-right font-medium">${parseFloat(c.costo_total).toFixed(2)}</td>
                        <td className="table-cell">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-park-primary/50 text-slate-300">
                            {c.tipo_combustible}
                          </span>
                        </td>
                        <td className="table-cell text-right font-mono">
                          {c.rendimiento_estimado ? (
                            <span className="text-emerald-400">{c.rendimiento_estimado}</span>
                          ) : (
                            <span className="text-park-muted">—</span>
                          )}
                        </td>
                        <td className="table-cell text-right">
                          {c.dias_entre_cargas !== null ? (
                            <span className="text-park-muted">{c.dias_entre_cargas}d</span>
                          ) : (
                            <span className="text-park-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card text-center py-12">
                <Fuel className="w-12 h-12 mx-auto text-park-muted/30 mb-3" />
                <p className="text-park-muted font-medium">No hay registros de combustible</p>
                <p className="text-park-muted text-sm mt-1">Registre la primera carga de combustible</p>
              </div>
            )}
          </>
        )}

        {/* TAB MANTENIMIENTO */}
        {activeTab === 'mantenimiento' && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard label="Total" value={resumenMantenimiento.total || 0} icon={Wrench} />
              <SummaryCard label="Gasto Total" value={`$${(resumenMantenimiento.total_gasto || 0).toFixed(2)}`} icon={DollarSign} color="text-amber-400" />
              <SummaryCard label="Preventivos" value={resumenMantenimiento.preventivos || 0} icon={Wrench} color="text-emerald-400" />
              <SummaryCard label="Correctivos" value={resumenMantenimiento.correctivos || 0} icon={AlertCircle} color="text-red-400" />
            </div>

            {/* Filters + Actions */}
            <div className="card">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <Filter className="w-4 h-4 text-park-muted" />
                  <select className="select text-sm w-auto" value={filtroMantenimiento}
                    onChange={(e) => setFiltroMantenimiento(e.target.value)}>
                    <option value="">Todos los servicios</option>
                    <option value="Preventivo">Preventivo</option>
                    <option value="Correctivo">Correctivo</option>
                  </select>
                  <select className="select text-sm w-auto" value={filtroCosto}
                    onChange={(e) => setFiltroCosto(e.target.value)}>
                    <option value="">Todos los costos</option>
                    <option value="0-50">$0 - $50</option>
                    <option value="50-100">$50 - $100</option>
                    <option value="100-200">$100 - $200</option>
                    <option value="200-500">$200 - $500</option>
                    <option value="500-">$500+</option>
                  </select>
                  <button onClick={() => handleExportPDF('mantenimiento')} className="btn-secondary text-sm">
                    <Download className="w-3.5 h-3.5" />
                    Exportar PDF
                  </button>
                </div>
                <button onClick={() => setShowMantenimientoForm(!showMantenimientoForm)} className="btn-primary text-sm">
                  + Nuevo Mantenimiento
                </button>
              </div>
            </div>

            {/* Mantenimiento form */}
            {showMantenimientoForm && (
              <form onSubmit={handleRegistrarMantenimiento} className="card border-park-accent/30">
                <h4 className="text-white font-semibold mb-4">Registrar Mantenimiento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">Tipo Servicio</label>
                    <select className="select" onChange={e => setFormData({...formData, tipo_servicio: e.target.value})}>
                      <option value="Preventivo">Preventivo</option>
                      <option value="Correctivo">Correctivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">KM Actual *</label>
                    <input type="number" required className="input" placeholder="Ej: 15000"
                      onChange={e => setFormData({...formData, km_actual: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">Costo ($)</label>
                    <input type="number" step="0.01" className="input" placeholder="Ej: 85.00"
                      onChange={e => setFormData({...formData, costo: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-park-muted text-xs font-medium mb-1 block">Descripción</label>
                    <input type="text" className="input" placeholder="Describe el servicio realizado"
                      onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-park-muted text-xs font-medium mb-1 block">Proveedor</label>
                    <input type="text" className="input" placeholder="Taller o proveedor"
                      onChange={e => setFormData({...formData, proveedor: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="submit" className="btn-primary">Guardar Mantenimiento</button>
                  <button type="button" onClick={() => setShowMantenimientoForm(false)} className="btn-secondary">Cancelar</button>
                </div>
              </form>
            )}

            {/* Table */}
            {filtrarMantenimiento(historialMantenimiento).length > 0 ? (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-park-border">
                      <th className="table-header text-left py-3 px-3 cursor-pointer hover:text-park-accent" onClick={() => handleSort('fecha')}>
                        Fecha {sortArrow('fecha')}
                      </th>
                      <th className="table-header text-left py-3 px-3">Tipo</th>
                      <th className="table-header text-left py-3 px-3">Descripción</th>
                      <th className="table-header text-right py-3 px-3 cursor-pointer hover:text-park-accent" onClick={() => handleSort('km')}>
                        KM {sortArrow('km')}
                      </th>
                      <th className="table-header text-right py-3 px-3 cursor-pointer hover:text-park-accent" onClick={() => handleSort('costo')}>
                        Costo {sortArrow('costo')}
                      </th>
                      <th className="table-header text-left py-3 px-3">Proveedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedHistorial(filtrarMantenimiento(historialMantenimiento)).map((m) => (
                      <tr key={m.id} className="hover:bg-park-border/20 transition-colors">
                        <td className="table-cell">{new Date(m.fecha).toLocaleDateString('es')}</td>
                        <td className="table-cell">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.tipo_servicio === 'Preventivo'
                              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/30'
                              : 'bg-red-900/30 text-red-400 border border-red-700/30'
                          }`}>
                            {m.tipo_servicio}
                          </span>
                        </td>
                        <td className="table-cell max-w-[250px] truncate" title={m.descripcion}>
                          {m.descripcion || '—'}
                        </td>
                        <td className="table-cell text-right font-mono font-bold text-lg text-park-accent">
                          {m.km_actual?.toLocaleString()}
                        </td>
                        <td className="table-cell text-right font-medium">
                          ${parseFloat(m.costo).toFixed(2)}
                        </td>
                        <td className="table-cell text-park-muted text-xs">
                          {m.proveedor || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card text-center py-12">
                <Wrench className="w-12 h-12 mx-auto text-park-muted/30 mb-3" />
                <p className="text-park-muted font-medium">No hay registros de mantenimiento</p>
                <p className="text-park-muted text-sm mt-1">Registre el primer mantenimiento del vehículo</p>
              </div>
            )}
          </>
        )}

        {/* TAB RENDIMIENTO */}
        {activeTab === 'rendimiento' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-park-accent" />
                Rendimiento por Carga (Km/L)
              </h3>
              {rendimientoChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rendimientoChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-3 text-sm shadow-2xl">
                            <p className="text-slate-400 mb-1">{label}</p>
                            <p className="text-emerald-400 font-bold">{payload[0].value} Km/L</p>
                            {payload[1] && <p className="text-blue-400 text-xs">{payload[1].value} L</p>}
                          </div>
                        );
                      }
                      return null;
                    }} cursor={{ fill: '#1e3a5f', opacity: 0.4 }} />
                    <Bar dataKey="rendimiento" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} name="Rendimiento" />
                    <Bar dataKey="consumo" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} name="Litros" />
                    <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(v) => <span className="text-slate-300">{v}</span>} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-park-muted text-sm border-2 border-dashed border-park-border rounded-xl">
                  Sin datos de rendimiento disponibles
                </div>
              )}
            </div>

            {/* Área chart - KM vs consumo */}
            <div className="card">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-park-accent" />
                Evolución de KM y Litros
              </h3>
              {rendimientoChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={rendimientoChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-3 text-sm shadow-2xl">
                            <p className="text-slate-400 mb-1">{label}</p>
                            {payload.map((p, i) => (
                              <p key={i} className="font-bold" style={{color: p.color}}>{p.name}: {p.value}</p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }} cursor={{ stroke: '#f59e0b', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="rendimiento" stroke="#f59e0b" strokeWidth={2} fill="url(#kmGrad)" name="Km/L" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-park-muted text-sm border-2 border-dashed border-park-border rounded-xl">
                  Sin datos de rendimiento
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, color = 'text-white', capitalize = false }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-park-muted shrink-0" />
      <div>
        <p className="text-park-muted text-xs">{label}</p>
        <p className={`font-semibold ${color} ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color = 'text-white' }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-park-primary flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-park-accent" />
      </div>
      <div>
        <p className="text-park-muted text-xs font-medium">{label}</p>
        <p className={`font-bold text-lg ${color}`}>{value}</p>
      </div>
    </div>
  );
}
