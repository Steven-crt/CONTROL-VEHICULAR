import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, Cell
} from 'recharts';
import {
  Gauge, Fuel, DollarSign, AlertTriangle, AlertCircle, Car,
  Calendar, TrendingUp, TrendingDown, Activity, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Movimiento() {
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingVehiculos, setLoadingVehiculos] = useState(true);
  const [showKmModal, setShowKmModal] = useState(false);
  const [kmManual, setKmManual] = useState('');
  const [registrandoKm, setRegistrandoKm] = useState(false);

  // Por defecto: este mes
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setFechaInicio(firstDay.toISOString().split('T')[0]);
    setFechaFin(now.toISOString().split('T')[0]);
    loadVehiculos();
  }, []);

  const loadVehiculos = async () => {
    try {
      const { data } = await api.get('/vehiculos');
      setVehiculos(data);
    } catch (err) {
      toast.error('Error al cargar vehículos');
    } finally {
      setLoadingVehiculos(false);
    }
  };

  const handleCalcular = async () => {
    if (!selectedVehiculo || !fechaInicio || !fechaFin) {
      toast.error('Seleccione un vehículo y un período');
      return;
    }
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      toast.error('La fecha fin debe ser posterior a la fecha inicio');
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post('/movimiento/calcular', {
        vehiculo_id: parseInt(selectedVehiculo),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      });
      setResultado(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al calcular');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const chartData = resultado?.consumo_por_carga?.map(c => ({
    fecha: new Date(c.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short' }),
    litros: c.litros,
    costo: c.costo,
    consumo: c.consumo_l100km,
    rendimiento: c.rendimiento_kmL
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Activity className="w-7 h-7 text-park-accent" />
          Módulo de Movimiento
        </h1>
        <p className="text-park-muted text-sm mt-1">
          Calcule el consumo, los kilómetros recorridos y los gastos en un período específico
        </p>
      </div>

      {/* Selector de período y vehículo */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-park-muted text-xs font-medium mb-1.5 block">Vehículo *</label>
            <select
              className="select"
              value={selectedVehiculo}
              onChange={(e) => setSelectedVehiculo(e.target.value)}
              disabled={loadingVehiculos}
            >
              <option value="">{loadingVehiculos ? 'Cargando...' : 'Seleccione un vehículo'}</option>
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.placa} - {v.marca || 'Sin marca'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-park-muted text-xs font-medium mb-1.5 block">Fecha Inicio *</label>
            <input
              type="date"
              className="input"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              max={fechaFin || undefined}
            />
          </div>
          <div>
            <label className="text-park-muted text-xs font-medium mb-1.5 block">Fecha Fin *</label>
            <input
              type="date"
              className="input"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={fechaInicio || undefined}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalcular}
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <span className="animate-pulse">Calculando...</span>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Calcular
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {resultado && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={Gauge}
              label="Kilómetros Recorridos"
              value={`${resultado.km.recorridos.toLocaleString()} km`}
              sub={`De ${resultado.km.inicial?.toLocaleString()} a ${resultado.km.final?.toLocaleString()} km`}
              color="text-blue-400"
              bgColor="bg-blue-500/10"
              borderColor="border-blue-500"
            />
            <KPICard
              icon={Fuel}
              label="Total Litros Cargados"
              value={`${resultado.combustible.total_litros.toFixed(1)} L`}
              sub={`${resultado.combustible.cargas} carga${resultado.combustible.cargas !== 1 ? 's' : ''}`}
              color="text-emerald-400"
              bgColor="bg-emerald-500/10"
              borderColor="border-emerald-500"
            />
            <KPICard
              icon={DollarSign}
              label="Gasto Total en Combustible"
              value={`$${resultado.combustible.gasto_total.toFixed(2)}`}
              sub={`Precio prom. $${resultado.combustible.precio_promedio.toFixed(2)}/L`}
              color="text-amber-400"
              bgColor="bg-amber-500/10"
              borderColor="border-amber-500"
            />
            <KPICard
              icon={Activity}
              label="Consumo Promedio"
              value={resultado.consumo.promedio_l100km ? `${resultado.consumo.promedio_l100km} L/100km` : 'N/A'}
              sub={resultado.consumo.historico_l100km ? `Histórico: ${resultado.consumo.historico_l100km} L/100km` : ''}
              color={resultado.consumo.alerta?.tipo === 'peligro' ? 'text-red-400' : resultado.consumo.alerta?.tipo === 'advertencia' ? 'text-amber-400' : 'text-purple-400'}
              bgColor={resultado.consumo.alerta?.tipo === 'peligro' ? 'bg-red-500/10' : resultado.consumo.alerta?.tipo === 'advertencia' ? 'bg-amber-500/10' : 'bg-purple-500/10'}
              borderColor={resultado.consumo.alerta?.tipo === 'peligro' ? 'border-red-500' : resultado.consumo.alerta?.tipo === 'advertencia' ? 'border-amber-500' : 'border-purple-500'}
            />
          </div>

          {/* Alerta */}
          {resultado.consumo.alerta && (
            <div className={`card border-2 ${
              resultado.consumo.alerta.tipo === 'peligro'
                ? 'border-red-500/50 bg-red-900/10'
                : 'border-amber-500/50 bg-amber-900/10'
            }`}>
              <div className="flex items-start gap-4">
                {resultado.consumo.alerta.tipo === 'peligro' ? (
                  <AlertCircle className="w-8 h-8 text-red-400 shrink-0 mt-1 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0 mt-1" />
                )}
                <div>
                  <h3 className={`font-bold text-lg ${
                    resultado.consumo.alerta.tipo === 'peligro' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {resultado.consumo.alerta.mensaje}
                  </h3>
                  <p className="text-slate-300 text-sm mt-1">{resultado.consumo.alerta.detalle}</p>
                </div>
              </div>
            </div>
          )}

          {/* Comparativa visual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de barras: Consumo por carga */}
            <div className="card">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-park-accent" />
                Consumo por Carga (L/100km)
              </h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit=" L/100km" />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-3 text-sm shadow-2xl">
                            <p className="text-slate-400 mb-1">{label}</p>
                            <p className="text-park-accent font-bold">{payload[0].value?.toFixed(2)} L/100km</p>
                            {payload[1] && <p className="text-blue-400 text-xs">${payload[1].value?.toFixed(2)}</p>}
                          </div>
                        );
                      }
                      return null;
                    }} cursor={{ fill: '#1e3a5f', opacity: 0.4 }} />
                    <Bar dataKey="consumo" name="Consumo" radius={[4, 4, 0, 0]} barSize={28}>
                      {chartData.map((entry, index) => {
                        const historico = resultado.consumo.historico_l100km || 0;
                        const esElevado = entry.consumo > historico * 1.15;
                        return <Cell key={index} fill={esElevado ? '#ef4444' : '#f59e0b'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-park-muted text-sm border-2 border-dashed border-park-border rounded-xl">
                  Sin cargas de combustible en este período
                </div>
              )}
            </div>

            {/* Gráfico de área: Rendimiento por carga */}
            <div className="card">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-park-accent" />
                Rendimiento por Carga (Km/L)
              </h3>
              {chartData.filter(d => d.rendimiento).length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit=" Km/L" />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-3 text-sm shadow-2xl">
                            <p className="text-slate-400 mb-1">{label}</p>
                            <p className="text-emerald-400 font-bold">{payload[0].value?.toFixed(2)} Km/L</p>
                          </div>
                        );
                      }
                      return null;
                    }} cursor={{ stroke: '#10b981', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="rendimiento" stroke="#10b981" strokeWidth={2} fill="url(#rendGrad)" name="Km/L" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-park-muted text-sm border-2 border-dashed border-park-border rounded-xl">
                  Sin datos de rendimiento en este período
                </div>
              )}
            </div>
          </div>

          {/* Comparativa de consumo */}
          <div className="card">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-park-accent" />
              Comparativa de Consumo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-park-border/20 rounded-xl">
                <p className="text-park-muted text-xs font-medium uppercase tracking-wider mb-2">Consumo en Período</p>
                <p className="text-3xl font-black text-park-accent">
                  {resultado.consumo.promedio_l100km?.toFixed(2) || 'N/A'}
                </p>
                <p className="text-park-muted text-xs mt-1">L/100km</p>
              </div>
              <div className="text-center p-4 bg-park-border/20 rounded-xl">
                <p className="text-park-muted text-xs font-medium uppercase tracking-wider mb-2">Consumo Histórico</p>
                <p className="text-3xl font-black text-blue-400">
                  {resultado.consumo.historico_l100km?.toFixed(2) || 'N/A'}
                </p>
                <p className="text-park-muted text-xs mt-1">L/100km (total vehículo)</p>
              </div>
              <div className="text-center p-4 bg-park-border/20 rounded-xl">
                <p className="text-park-muted text-xs font-medium uppercase tracking-wider mb-2">Diferencia</p>
                <p className={`text-3xl font-black ${
                  resultado.consumo.diferencia_porcentual > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {resultado.consumo.diferencia_porcentual != null
                    ? `${resultado.consumo.diferencia_porcentual > 0 ? '+' : ''}${resultado.consumo.diferencia_porcentual.toFixed(1)}%`
                    : 'N/A'}
                </p>
                <p className="text-park-muted text-xs mt-1">
                  {resultado.consumo.diferencia_porcentual > 0 
                    ? 'Por encima del promedio' 
                    : resultado.consumo.diferencia_porcentual < 0 
                      ? 'Por debajo del promedio'
                      : 'Sin cambios'}
                </p>
              </div>
            </div>

            {/* Barra comparativa visual */}
            {resultado.consumo.promedio_l100km && resultado.consumo.historico_l100km && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-park-muted mb-2">
                  <span>Histórico: {resultado.consumo.historico_l100km.toFixed(2)}</span>
                  <span>Actual: {resultado.consumo.promedio_l100km.toFixed(2)}</span>
                </div>
                <div className="relative h-6 bg-park-border/30 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((resultado.consumo.historico_l100km / Math.max(resultado.consumo.promedio_l100km, resultado.consumo.historico_l100km)) * 100, 100)}%` }}
                  />
                  <div 
                    className="absolute inset-y-0 rounded-full transition-all duration-500 opacity-70"
                    style={{ 
                      width: `${Math.min((resultado.consumo.promedio_l100km / Math.max(resultado.consumo.promedio_l100km, resultado.consumo.historico_l100km)) * 100, 100)}%`,
                      backgroundColor: resultado.consumo.alerta?.tipo === 'peligro' ? '#ef4444' : resultado.consumo.alerta?.tipo === 'advertencia' ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-blue-400">● Histórico</span>
                  <span className={resultado.consumo.alerta?.tipo === 'peligro' ? 'text-red-400' : resultado.consumo.alerta?.tipo === 'advertencia' ? 'text-amber-400' : 'text-emerald-400'}>
                    ● Actual
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Últimos movimientos */}
          {resultado.ultimos_movimientos?.length > 0 && (
            <div className="card">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-park-accent" />
                Últimos Movimientos
              </h3>
              <div className="space-y-2">
                {resultado.ultimos_movimientos.map((mov, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-park-border/20 hover:bg-park-border/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        mov.tipo === 'combustible' ? 'bg-emerald-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <p className="text-white text-sm font-medium capitalize">{mov.tipo}</p>
                        <p className="text-park-muted text-xs">
                          {new Date(mov.fecha).toLocaleDateString('es', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-white">
                      {mov.tipo === 'combustible' 
                        ? `${parseFloat(mov.litros).toFixed(1)} L`
                        : `$${parseFloat(mov.monto).toFixed(2)}`
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón para registrar KM manual */}
          <div className="card border-park-accent/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-park-accent" />
                  ¿No tienes cargas de combustible en este período?
                </h3>
                <p className="text-park-muted text-sm mt-1">
                  Registra lecturas manuales de kilometraje para calcular el consumo exacto
                </p>
              </div>
              <button
                onClick={() => {
                  if (!selectedVehiculo) {
                    toast.error('Primero seleccione un vehículo');
                    return;
                  }
                  setKmManual('');
                  setShowKmModal(true);
                }}
                className="btn-primary"
              >
                <Gauge className="w-4 h-4" />
                Registrar Avance de KM
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal para registrar KM manual */}
      {showKmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowKmModal(false)}>
          <div className="bg-park-card border border-park-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-park-accent" />
              Registrar Avance de KM
            </h3>
            <p className="text-park-muted text-sm mb-4">
              Ingrese la lectura actual del odómetro para calcular el consumo sin necesidad de cargar combustible.
            </p>
            <input
              type="number"
              className="input text-lg font-mono"
              placeholder="Ej: 15000"
              value={kmManual}
              onChange={(e) => setKmManual(e.target.value)}
              autoFocus
              min={0}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={async () => {
                  if (!kmManual || isNaN(kmManual)) {
                    toast.error('Ingrese un valor numérico válido');
                    return;
                  }
                  try {
                    setRegistrandoKm(true);
                    await api.post(`/vehiculos/${selectedVehiculo}/kilometraje`, {
                      km_actual: parseInt(kmManual),
                      observaciones: 'Registro manual desde Módulo de Movimiento'
                    });
                    toast.success('Kilometraje registrado exitosamente');
                    setShowKmModal(false);
                    handleCalcular();
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Error al registrar');
                  } finally {
                    setRegistrandoKm(false);
                  }
                }}
                disabled={registrandoKm}
                className="btn-primary flex-1 justify-center"
              >
                {registrandoKm ? 'Registrando...' : 'Registrar'}
              </button>
              <button
                onClick={() => setShowKmModal(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {!resultado && !loading && (
        <div className="card text-center py-16">
          <Activity className="w-16 h-16 mx-auto text-park-muted/30 mb-4" />
          <p className="text-park-muted text-lg font-medium">Seleccione un vehículo y un período</p>
          <p className="text-park-muted text-sm mt-1">
            El sistema calculará automáticamente los kilómetros recorridos, consumo y gastos
          </p>
        </div>
      )}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color, bgColor, borderColor }) {
  return (
    <div className={`card p-5 relative overflow-hidden group border-t-2 ${borderColor}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} rounded-full blur-3xl -mr-10 -mt-10 opacity-30 group-hover:opacity-50 transition-opacity`} />
      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-12 h-12 rounded-2xl ${bgColor} flex items-center justify-center shrink-0 border border-white/5`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-park-muted text-xs font-bold uppercase tracking-widest truncate">{label}</p>
          <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-park-muted text-[10px] mt-0.5 font-medium truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
