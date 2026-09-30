import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, Calendar, Car, Fuel, Wrench, DollarSign, AlertTriangle } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';

const PALETTE_CLASSES = [
  'text-[#3b82f6]',
  'text-[#8b5cf6]',
  'text-[#f59e0b]',
  'text-[#10b981]',
  'text-[#ef4444]',
  'text-[#06b6d4]',
];
const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
const customTooltip = ({ active, payload, label }, currency) => {
  if (active && payload?.length) return (
    <div className="bg-cv-card border border-cv-border rounded-lg p-3 text-sm shadow-xl">
      <p className="text-cv-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className={`font-bold ${PALETTE_CLASSES[COLORS.indexOf(p.color)] || ''}`}>
          {p.name}: {currency}{Number(p.value || 0).toFixed(2)}
        </p>
      ))}
    </div>
  );
  return null;
};

function StatCard({ icon, label, value, color, iconBg }) {
  const Icon = icon;
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-cv-muted text-xs font-bold uppercase tracking-wider">{label}</p>
        <p className="text-cv-text text-2xl font-black mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// Rcordatorio que hay un prblema en los simpbolos de esta linea se recomenienda repararla 
function sanitizeCurrency(c) {
  if (!c || typeof c !== 'string') return '$';
  const v = c.trim().slice(0, 5);
  return /^[A-Za-z$€£¥S\/\.]{1,5}$/.test(v) ? v : '€';
}
export default function Reportes() {
  const { config } = useConfig();
  const currency = sanitizeCurrency(config?.moneda);
  const [desde, setDesde] = useState(new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const [vehiculosResumen, setVehiculosResumen] = useState(null);
  const [combustible, setCombustible] = useState({ por_periodo: [], total: 0, cargas: 0, litros: 0 });
  const [mantenimiento, setMantenimiento] = useState({ por_periodo: [], total: 0, servicios: 0, por_tipo: [] });
  const [gastosConsolidado, setGastosConsolidado] = useState([]);
  const [vehiculosRecientes, setVehiculosRecientes] = useState([]);
  const [anomalias, setAnomalias] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const [vr, co, ma, gc, rec, an] = await Promise.all([
        api.get('/reportes/vehiculos-resumen'),
        api.get(`/reportes/combustible-resumen?desde=${desde}&hasta=${hasta}&agrupar=mes`),
        api.get(`/reportes/mantenimiento-resumen?desde=${desde}&hasta=${hasta}&agrupar=mes`),
        api.get(`/reportes/gastos-consolidado?desde=${desde}&hasta=${hasta}&agrupar=mes`),
        api.get('/reportes/vehiculos-recientes'),
        api.get(`/reportes/anomalias-resumen?desde=${desde}&hasta=${hasta}`),
      ]);
      setVehiculosResumen(vr.data);
      setCombustible(co.data);
      setMantenimiento(ma.data);
      setGastosConsolidado(gc.data);
      setVehiculosRecientes(rec.data);
      setAnomalias(an.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const totalGastos = (combustible.total || 0) + (mantenimiento.total || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filtros */}
      <div className="card flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-4">
        <div>
          <label className="block text-cv-muted text-sm mb-1">Desde</label>
          <input type="date" className="input" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-cv-muted text-sm mb-1">Hasta</label>
          <input type="date" className="input" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <button onClick={fetch} disabled={loading} className="btn-primary">
          <TrendingUp className="w-4 h-4" /> {loading ? 'Cargando...' : 'Generar Reporte'}
        </button>
        <div className="w-full sm:w-auto sm:ml-auto text-left sm:text-right mt-2 sm:mt-0">
          <p className="text-cv-muted text-xs">Total gastos período</p>
          <p className="text-cv-accent text-2xl font-black">{currency}{(totalGastos || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Total Vehículos" value={vehiculosResumen?.total || 0} color="text-blue-400" iconBg="bg-blue-500/20" />
        <StatCard icon={Fuel} label="Gasto Combustible" value={`${currency}${(combustible.total || 0).toFixed(2)}`} color="text-amber-400" iconBg="bg-amber-500/20" />
        <StatCard icon={Wrench} label="Gasto Mantenimiento" value={`${currency}${(mantenimiento.total || 0).toFixed(2)}`} color="text-emerald-400" iconBg="bg-emerald-500/20" />
        <StatCard icon={DollarSign} label="Total Gastos" value={`${currency}${(totalGastos || 0).toFixed(2)}`} color="text-red-400" iconBg="bg-red-500/20" />
      </div>

      {/* Gráfico gastos consolidados */}
      <div className="card">
        <h3 className="text-cv-text font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-500" /> Gastos Consolidados (Combustible + Mantenimiento)
        </h3>
        {gastosConsolidado.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={gastosConsolidado}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
              <XAxis dataKey="periodo" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${currency}${v}`} />
              <Tooltip content={p => customTooltip(p, currency)} />
              <Bar dataKey="combustible" name="Combustible" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="gastos" />
              <Bar dataKey="mantenimiento" name="Mantenimiento" fill="#10b981" radius={[4, 4, 0, 0]} stackId="gastos" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-cv-muted">Sin datos de gastos en el período</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por tipo */}
        <div className="card">
          <h3 className="text-cv-text font-semibold mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-500" /> Vehículos por Tipo
          </h3>
          {vehiculosResumen?.por_tipo?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={vehiculosResumen.por_tipo} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} stroke="none">
                  {vehiculosResumen.por_tipo.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-cv-muted">Sin datos</div>
          )}
        </div>

        {/* Distribución por marca */}
        <div className="card">
          <h3 className="text-cv-text font-semibold mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-purple-500" /> Vehículos por Marca
          </h3>
          {vehiculosResumen?.por_marca?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vehiculosResumen.por_marca} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip />
                <Bar dataKey="value" name="Vehículos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-cv-muted">Sin datos</div>
          )}
        </div>
      </div>

      {/* Gastos de mantenimiento por tipo */}
      {mantenimiento.por_tipo?.length > 0 && (
        <div className="card">
          <h3 className="text-cv-text font-semibold mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-500" /> Mantenimiento por Tipo de Servicio
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {mantenimiento.por_tipo.map((t, i) => (
              <div key={i} className="bg-cv-border/20 rounded-xl p-3 text-center">
                <p className="text-cv-muted text-xs uppercase font-semibold">{t.name}</p>
                <p className="text-cv-text text-lg font-black mt-1">{t.value}</p>
                <p className="text-cv-accent text-sm">{currency}{(t.total || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalías reportadas */}
      {anomalias && (
        <div className="card">
          <h3 className="text-cv-text font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Anomalías Reportadas
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-cv-border/20 rounded-xl p-3 text-center">
              <p className="text-cv-muted text-xs uppercase font-semibold">Abiertas</p>
              <p className="text-amber-400 text-2xl font-black mt-1">{anomalias.abiertas || 0}</p>
            </div>
            <div className="bg-cv-border/20 rounded-xl p-3 text-center">
              <p className="text-cv-muted text-xs uppercase font-semibold">Críticas abiertas</p>
              <p className="text-red-400 text-2xl font-black mt-1">{anomalias.criticas_abiertas || 0}</p>
            </div>
            <div className="bg-cv-border/20 rounded-xl p-3 text-center">
              <p className="text-cv-muted text-xs uppercase font-semibold">Cerradas</p>
              <p className="text-emerald-400 text-2xl font-black mt-1">{anomalias.cerradas || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="text-cv-muted text-xs font-bold uppercase tracking-wider mb-2">Por severidad</p>
              {anomalias.por_severidad?.length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={anomalias.por_severidad}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="value" name="Reportes" radius={[4, 4, 0, 0]}>
                      {anomalias.por_severidad.map((s, i) => (
                        <Cell key={i} fill={s.name === 'alta' ? '#ef4444' : s.name === 'media' ? '#f59e0b' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-32 flex items-center justify-center text-cv-muted text-sm">Sin anomalías en el período</div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {(anomalias.por_tipo || []).map((t, i) => (
                  <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${t.pendientes > 0 ? 'bg-amber-500/15 text-amber-300' : 'bg-cv-border/40 text-cv-muted'}`}>
                    {t.name}: {t.value}{t.pendientes > 0 ? ` (${t.pendientes} pend.)` : ''}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-cv-muted text-xs font-bold uppercase tracking-wider mb-2">Más recientes</p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(anomalias.recientes || []).map(a => {
                  const sevCls = a.severidad === 'alta' ? 'bg-red-500/20 text-red-400' : a.severidad === 'media' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400';
                  const estCls = a.estado === 'Pendiente' ? 'bg-yellow-500/20 text-yellow-300' : a.estado === 'Resuelta' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-300';
                  return (
                    <div key={a.id} className="bg-cv-border/20 rounded-lg p-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-cv-text text-sm font-bold truncate">
                          {a.tipo} <span className="text-cv-muted font-normal">· {a.placa || '-'}</span>
                        </p>
                        <p className="text-cv-muted text-xs truncate">{a.descripcion}</p>
                        <p className="text-cv-muted text-[11px] mt-0.5">{a.reportado_por || '-'} · {new Date(a.created_at).toLocaleDateString('es-EC')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold capitalize ${sevCls}`}>{a.severidad}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${estCls}`}>{a.estado}</span>
                      </div>
                    </div>
                  );
                })}
                {!anomalias.recientes?.length && <p className="text-center text-cv-muted py-6 text-sm">Sin anomalías registradas</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehículos recientes */}
      <div className="card">
        <h3 className="text-cv-text font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cv-accent" /> Últimos Vehículos Registrados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cv-border">
                {['Placa', 'Tipo', 'Marca', 'Modelo', 'Color', 'Fecha'].map(h => (
                  <th key={h} className="table-header text-left pb-3 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehiculosRecientes.map(v => (
                <tr key={v.id} className="hover:bg-cv-border/10 transition-colors">
                  <td className="table-cell px-2 font-bold">{v.placa}</td>
                  <td className="table-cell px-2 capitalize">{v.tipo}</td>
                  <td className="table-cell px-2 text-cv-muted">{v.marca || '-'}</td>
                  <td className="table-cell px-2 text-cv-muted">{v.modelo || '-'}</td>
                  <td className="table-cell px-2 text-cv-muted">{v.color || '-'}</td>
                  <td className="table-cell px-2 text-cv-muted">{new Date(v.created_at).toLocaleDateString('es-EC')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!vehiculosRecientes.length && <p className="text-center text-cv-muted py-6">Sin vehículos registrados</p>}
        </div>
      </div>
    </div>
  );
}
