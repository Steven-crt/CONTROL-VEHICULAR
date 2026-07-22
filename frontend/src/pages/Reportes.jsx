import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, Calendar, Car, Fuel, Wrench, DollarSign } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
const customTooltip = ({ active, payload, label }, currency) => {
  if (active && payload?.length) return (
    <div className="bg-park-card border border-park-border rounded-lg p-3 text-sm shadow-xl">
      <p className="text-park-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name}: {currency}{Number(p.value || 0).toFixed(2)}
        </p>
      ))}
    </div>
  );
  return null;
};

function StatCard({ icon: Icon, label, value, color, iconBg }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-park-muted text-xs font-bold uppercase tracking-wider">{label}</p>
        <p className="text-park-text text-2xl font-black mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function Reportes() {
  const { config } = useConfig();
  const currency = config?.moneda || '$';
  const [desde, setDesde] = useState(new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const [vehiculosResumen, setVehiculosResumen] = useState(null);
  const [combustible, setCombustible] = useState({ por_periodo: [], total: 0, cargas: 0, litros: 0 });
  const [mantenimiento, setMantenimiento] = useState({ por_periodo: [], total: 0, servicios: 0, por_tipo: [] });
  const [gastosConsolidado, setGastosConsolidado] = useState([]);
  const [vehiculosRecientes, setVehiculosRecientes] = useState([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const [vr, co, ma, gc, rec] = await Promise.all([
        api.get('/reportes/vehiculos-resumen'),
        api.get(`/reportes/combustible-resumen?desde=${desde}&hasta=${hasta}&agrupar=mes`),
        api.get(`/reportes/mantenimiento-resumen?desde=${desde}&hasta=${hasta}&agrupar=mes`),
        api.get(`/reportes/gastos-consolidado?desde=${desde}&hasta=${hasta}&agrupar=mes`),
        api.get('/reportes/vehiculos-recientes'),
      ]);
      setVehiculosResumen(vr.data);
      setCombustible(co.data);
      setMantenimiento(ma.data);
      setGastosConsolidado(gc.data);
      setVehiculosRecientes(rec.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const totalGastos = combustible.total + mantenimiento.total;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filtros */}
      <div className="card flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-4">
        <div>
          <label className="block text-park-muted text-sm mb-1">Desde</label>
          <input type="date" className="input" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-park-muted text-sm mb-1">Hasta</label>
          <input type="date" className="input" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <button onClick={fetch} disabled={loading} className="btn-primary">
          <TrendingUp className="w-4 h-4" /> {loading ? 'Cargando...' : 'Generar Reporte'}
        </button>
        <div className="w-full sm:w-auto sm:ml-auto text-left sm:text-right mt-2 sm:mt-0">
          <p className="text-park-muted text-xs">Total gastos período</p>
          <p className="text-park-accent text-2xl font-black">{currency}{totalGastos.toFixed(2)}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Total Vehículos" value={vehiculosResumen?.total || 0} color="text-blue-400" iconBg="bg-blue-500/20" />
        <StatCard icon={Fuel} label="Gasto Combustible" value={`${currency}${combustible.total.toFixed(2)}`} color="text-amber-400" iconBg="bg-amber-500/20" />
        <StatCard icon={Wrench} label="Gasto Mantenimiento" value={`${currency}${mantenimiento.total.toFixed(2)}`} color="text-emerald-400" iconBg="bg-emerald-500/20" />
        <StatCard icon={DollarSign} label="Total Gastos" value={`${currency}${totalGastos.toFixed(2)}`} color="text-red-400" iconBg="bg-red-500/20" />
      </div>

      {/* Gráfico gastos consolidados */}
      <div className="card">
        <h3 className="text-park-text font-semibold mb-4 flex items-center gap-2">
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
          <div className="h-48 flex items-center justify-center text-park-muted">Sin datos de gastos en el período</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por tipo */}
        <div className="card">
          <h3 className="text-park-text font-semibold mb-4 flex items-center gap-2">
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
            <div className="h-44 flex items-center justify-center text-park-muted">Sin datos</div>
          )}
        </div>

        {/* Distribución por marca */}
        <div className="card">
          <h3 className="text-park-text font-semibold mb-4 flex items-center gap-2">
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
            <div className="h-44 flex items-center justify-center text-park-muted">Sin datos</div>
          )}
        </div>
      </div>

      {/* Gastos de mantenimiento por tipo */}
      {mantenimiento.por_tipo?.length > 0 && (
        <div className="card">
          <h3 className="text-park-text font-semibold mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-500" /> Mantenimiento por Tipo de Servicio
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {mantenimiento.por_tipo.map((t, i) => (
              <div key={i} className="bg-park-border/20 rounded-xl p-3 text-center">
                <p className="text-park-muted text-xs uppercase font-semibold">{t.name}</p>
                <p className="text-park-text text-lg font-black mt-1">{t.value}</p>
                <p className="text-park-accent text-sm">{currency}{t.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehículos recientes */}
      <div className="card">
        <h3 className="text-park-text font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-park-accent" /> Últimos Vehículos Registrados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-park-border">
                {['Placa', 'Tipo', 'Marca', 'Modelo', 'Color', 'Cliente', 'Fecha'].map(h => (
                  <th key={h} className="table-header text-left pb-3 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehiculosRecientes.map(v => (
                <tr key={v.id} className="hover:bg-park-border/10 transition-colors">
                  <td className="table-cell px-2 font-bold">{v.placa}</td>
                  <td className="table-cell px-2 capitalize">{v.tipo}</td>
                  <td className="table-cell px-2 text-park-muted">{v.marca || '-'}</td>
                  <td className="table-cell px-2 text-park-muted">{v.modelo || '-'}</td>
                  <td className="table-cell px-2 text-park-muted">{v.color || '-'}</td>
                  <td className="table-cell px-2 text-park-muted">{v.cliente_nombre || 'Sin asignar'}</td>
                  <td className="table-cell px-2 text-park-muted">{new Date(v.created_at).toLocaleDateString('es-EC')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!vehiculosRecientes.length && <p className="text-center text-park-muted py-6">Sin vehículos registrados</p>}
        </div>
      </div>
    </div>
  );
}
