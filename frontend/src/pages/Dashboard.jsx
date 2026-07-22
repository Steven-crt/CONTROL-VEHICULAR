import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Car, DollarSign, Users, Wrench, Fuel, PieChart as PieIcon } from 'lucide-react';

const TIPO_COLORS = { auto: '#3b82f6', moto: '#8b5cf6', VIP: '#f59e0b', discapacitado: '#10b981' };
const PIE_FALLBACK = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

import { useConfig } from '../contexts/ConfigContext';

function StatCard({ icon: Icon, label, value, sub, color, iconBg, cardBg }) {
  return (
    <div className={`card p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group ${cardBg} border-t-2`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${iconBg} rounded-full blur-3xl -mr-10 -mt-10 opacity-30 group-hover:opacity-50 transition-opacity`} />
      <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative z-10 border border-white/5`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <div className="relative z-10 flex-1">
        <p className="text-park-muted text-xs font-bold uppercase tracking-widest">{label}</p>
        <p className="text-park-text text-3xl font-black mt-1 tracking-tight">{value}</p>
        {sub && <p className="text-park-muted text-xs mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

const customTooltip = ({ active, payload, label }, pre = "$") => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-3 text-sm shadow-2xl backdrop-blur-md">
        <p className="text-slate-400 mb-1 font-semibold">{label}</p>
        <p className="text-white font-black text-lg">
          {pre}{typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { config } = useConfig();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/reportes/dashboard');
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-park-accent animate-pulse font-medium tracking-wide">Actualizando métricas...</div>
    </div>
  );

  const moneda = config?.moneda || '$';

  const tiposData = (data?.vehiculos_por_tipo || []).map(d => ({
    name: d.name,
    value: parseInt(d.value) || 0
  }));

  const combustibleChart = (data?.combustible_por_mes || []).map(d => ({
    periodo: d.periodo,
    total: parseFloat(d.total) || 0
  }));

  const mantenimientoChart = (data?.mantenimiento_por_tipo || []).map(d => ({
    name: d.name,
    value: parseInt(d.value) || 0
  }));

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          icon={Car}
          label="Total Vehículos"
          value={data?.total_vehiculos || 0}
          sub="Vehículos registrados en el sistema"
          color="text-blue-400"
          iconBg="bg-blue-500/20"
          cardBg="bg-gradient-to-b from-blue-500/5 to-transparent border-t-blue-500"
        />
        <StatCard
          icon={Users}
          label="Total Clientes"
          value={data?.total_clientes || 0}
          sub="Propietarios registrados"
          color="text-purple-400"
          iconBg="bg-purple-500/20"
          cardBg="bg-gradient-to-b from-purple-500/5 to-transparent border-t-purple-500"
        />
        <StatCard
          icon={Fuel}
          label="Gasto Combustible"
          value={`${moneda}${(data?.gastos_combustible_mes || 0).toFixed(2)}`}
          sub="Gasto del mes actual"
          color="text-amber-400"
          iconBg="bg-amber-500/20"
          cardBg="bg-gradient-to-b from-amber-500/5 to-transparent border-t-amber-500"
        />
        <StatCard
          icon={Wrench}
          label="Gasto Mantenimiento"
          value={`${moneda}${(data?.gastos_mantenimiento_mes || 0).toFixed(2)}`}
          sub="Gasto del mes actual"
          color="text-emerald-400"
          iconBg="bg-emerald-500/20"
          cardBg="bg-gradient-to-b from-emerald-500/5 to-transparent border-t-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por tipo (PieChart) */}
        <div className="card flex flex-col">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-purple-500" /> Tipos de Vehículos
            </h3>
            <p className="text-park-muted text-xs mt-1">Distribución del parque automotor</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[260px]">
            {tiposData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={tiposData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} stroke="none">
                    {tiposData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TIPO_COLORS[entry.name] || PIE_FALLBACK[index % PIE_FALLBACK.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-lg p-2 text-sm shadow-xl">
                          <p className="text-slate-300 capitalize">{payload[0].name}</p>
                          <p className="text-white font-bold text-lg">{payload[0].value} vehículos</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} formatter={(v) => <span className="capitalize text-slate-300">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-park-muted text-sm border-2 border-dashed border-park-border rounded-xl p-8 text-center w-full">
                No hay vehículos registrados
              </div>
            )}
          </div>
        </div>

        {/* Gastos Combustible por mes (BarChart) */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-500" /> Gastos de Combustible
              </h3>
              <p className="text-park-muted text-xs mt-1">Evolución mensual de gasto en combustible</p>
            </div>
          </div>
          {combustibleChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={combustibleChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="periodo" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${moneda}${v}`} />
                <Tooltip content={p => customTooltip(p, moneda)} cursor={{ fill: '#1e3a5f', opacity: 0.4 }} />
                <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-park-muted text-sm border-2 border-dashed border-park-border rounded-xl">
              Sin datos de combustible
            </div>
          )}
        </div>

        {/* Mantenimiento por tipo de servicio (BarChart) */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-500" /> Mantenimiento por Servicio
              </h3>
              <p className="text-park-muted text-xs mt-1">Cantidad de servicios de mantenimiento realizados</p>
            </div>
          </div>
          {mantenimientoChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mantenimientoChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={p => customTooltip(p, '')} cursor={{ fill: '#1e3a5f', opacity: 0.4 }} />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-park-muted text-sm border-2 border-dashed border-park-border rounded-xl">
              Sin datos de mantenimiento
            </div>
          )}
        </div>

        {/* Vehículos Recientes */}
        <div className="card flex flex-col lg:col-span-3">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-500" /> Últimos Vehículos Registrados
          </h3>
          <div className="space-y-3 flex-1">
            {(data?.ultimos_vehiculos || []).map((e, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-park-border/20 hover:bg-park-border/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-blue-400/50 shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                  <div>
                    <p className="text-white font-bold text-sm tracking-wide">{e.placa}</p>
                    <p className="text-park-muted text-[10px] uppercase font-semibold">{e.marca} {e.modelo} - {e.tipo}</p>
                  </div>
                </div>
                <div className="text-right">
                  {e.cliente_nombre && <p className="text-park-muted text-xs">{e.cliente_nombre}</p>}
                  <span className="bg-[#0f172a] text-slate-300 px-2.5 py-1 rounded-md text-xs font-medium border border-park-border/50">
                    {new Date(e.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
            {!data?.ultimos_vehiculos?.length && (
              <div className="h-full flex items-center justify-center flex-col text-slate-500 text-sm gap-2 mt-4">
                <Car className="w-8 h-8 opacity-20" />
                No hay vehículos registrados
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
