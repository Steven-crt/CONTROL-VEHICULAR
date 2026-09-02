import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { useRealTime } from '../api/realtime';
import toast from 'react-hot-toast';
import { Fuel, Wrench, Check, X as XIcon, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
//se debe cambiar el nombre de depidos a tanqeuo
const ESTADO_COLORS = {
  Pendiente: 'text-amber-400 bg-amber-900/30',
  Surtida: 'text-emerald-400 bg-emerald-900/30',
  Completado: 'text-emerald-400 bg-emerald-900/30',
  Rechazada: 'text-red-400 bg-red-900/30',
  Rechazado: 'text-red-400 bg-red-900/30'
};

const fmtFecha = (f) => {
  if (!f) return '—';
  const d = new Date(f);
  return isNaN(d.getTime()) ? String(f) : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Pedidos() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  const [tab, setTab] = useState('combustible');
  const [pedidos, setPedidos] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehiculo_id: '', litros: '', km_actual: '', tipo_combustible: 'Gasolina', observaciones: '' });

  const fetchPedidos = useCallback(async () => {
    try {
      const base = tab === 'combustible' ? '/combustible' : '/mantenimiento';
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (!esAdmin) params.solo_mios = '1';
      const r = await api.get(base, { params });
      setPedidos(r.data || []);
    } catch {
      toast.error('Error al cargar pedidos');
    }
  }, [tab, filtroEstado, esAdmin]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);
  useEffect(() => {
    api.get('/vehiculos').then(r => setVehiculos(r.data || [])).catch(() => {});
  }, []);

  // Tiempo real: si llega un cambio de combustible o mantenimiento (nuevo
  // pedido, aprobación o rechazo de otro usuario), refresca la tabla al instante.
  const pedidoVivo = useMemo(() => (tab === 'combustible' ? 'combustible' : 'mantenimiento'), [tab]);
  useRealTime([pedidoVivo], () => { fetchPedidos(); });

  const openAdd = () => setModal(true);

  const savePedido = async (e) => {
    e.preventDefault();
    if (!form.vehiculo_id) return toast.error('Selecciona un vehículo');
    setSaving(true);
    try {
      if (tab === 'combustible') {
        await api.post('/combustible', {
          vehiculo_id: form.vehiculo_id,
          litros: Number(form.litros),
          km_actual: Number(form.km_actual),
          tipo_combustible: form.tipo_combustible,
          observaciones: form.observaciones
        });
      } else {
        await api.post('/mantenimiento', {
          vehiculo_id: form.vehiculo_id,
          km_actual: Number(form.km_actual),
          descripcion: form.observaciones || 'Solicitud de mantenimiento'
        });
      }
      toast.success('Pedido enviado. Queda pendiente de aprobación.');
      setModal(false);
      setForm({ vehiculo_id: '', litros: '', km_actual: '', tipo_combustible: 'Gasolina', observaciones: '' });
      setFiltroEstado('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar el pedido');
    } finally { setSaving(false); }
  };

  const atender = async (id) => {
    try {
      if (tab === 'combustible') await api.put(`/combustible/${id}/atender`, {});
      else await api.put(`/mantenimiento/${id}/atender`, {});
      toast.success('Pedido aprobado');
      fetchPedidos();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al aprobar');
    }
  };

  const rechazar = async (id) => {
    if (!confirm('¿Rechazar este pedido?')) return;
    try {
      if (tab === 'combustible') await api.put(`/combustible/${id}/rechazar`, {});
      else await api.put(`/mantenimiento/${id}/rechazar`, {});
      toast.success('Pedido rechazado');
      fetchPedidos();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al rechazar');
    }
  };

  const esPendiente = (p) => p.estado === 'Pendiente';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-cv-text font-semibold text-lg flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-cv-accent" /> {esAdmin ? 'Pedidos' : 'Mis Pedidos'}
        </h2>
        <div className="flex gap-2 items-center flex-wrap">
          <select className="select w-auto" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="Pendiente">Pendientes</option>
            {tab === 'combustible'
              ? <><option value="Surtida">Surtidas</option><option value="Rechazada">Rechazadas</option></>
              : <><option value="Completado">Completados</option><option value="Rechazado">Rechazados</option></>}
          </select>
          <button onClick={openAdd} className="btn-primary"><ClipboardList className="w-4 h-4" /> Nuevo Pedido</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('combustible')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'combustible' ? 'bg-cv-accent text-cv-dark' : 'bg-cv-border/30 text-cv-muted hover:text-cv-text'}`}>
          <Fuel className="w-4 h-4" /> Combustible
        </button>
        <button onClick={() => setTab('mantenimiento')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'mantenimiento' ? 'bg-cv-accent text-cv-dark' : 'bg-cv-border/30 text-cv-muted hover:text-cv-text'}`}>
          <Wrench className="w-4 h-4" /> Mantenimiento
        </button>
      </div>

      {/* Listado */}
      <div className="card overflow-x-auto">
        {tab === 'combustible' ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-cv-border">
                {['Código', 'Vehículo', 'Solicitante', 'Galones', 'KM', 'Tipo', 'Estado', 'Fecha', esAdmin ? 'Acciones' : ''].map(h => (
                  h ? <th key={h} className="table-header text-left pb-3 px-2">{h}</th> : null
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id} className="hover:bg-cv-border/10 transition-colors">
                  <td className="table-cell px-2 font-mono text-xs text-cv-muted">{p.codigo}</td>
                  <td className="table-cell px-2 font-medium">{p.placa}<span className="block text-xs text-cv-muted">{p.marca} {p.modelo}</span></td>
                  <td className="table-cell px-2 text-cv-muted text-sm">{p.solicitante_nombre || '—'}</td>
                  <td className="table-cell px-2">{p.litros_solicitados ?? p.litros ?? '—'}</td>
                  <td className="table-cell px-2">{p.km_actual != null ? Number(p.km_actual).toLocaleString() : '—'}</td>
                  <td className="table-cell px-2">{p.tipo_combustible}</td>
                  <td className="table-cell px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[p.estado] || ''}`}>{p.estado}</span>
                  </td>
                  <td className="table-cell px-2 text-cv-muted text-sm">{fmtFecha(p.fecha_carga)}</td>
                  {esAdmin && (
                    <td className="table-cell px-2">
                      {esPendiente(p) ? (
                        <div className="flex gap-2">
                          <button onClick={() => atender(p.id)} className="btn-primary !py-1 !px-3 text-xs justify-center"><Check className="w-3.5 h-3.5" /> Aprobar</button>
                          <button onClick={() => rechazar(p.id)} className="btn-secondary !py-1 !px-3 text-xs justify-center text-red-400"><XIcon className="w-3.5 h-3.5" /> Rechazar</button>
                        </div>
                      ) : <span className="text-cv-muted text-xs">Atendido</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-cv-border">
                {['Código', 'Vehículo', 'Solicitante', 'Servicio', 'Descripción', 'KM', 'Estado', 'Fecha', esAdmin ? 'Acciones' : ''].map(h => (
                  h ? <th key={h} className="table-header text-left pb-3 px-2">{h}</th> : null
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id} className="hover:bg-cv-border/10 transition-colors">
                  <td className="table-cell px-2 font-mono text-xs text-cv-muted">{p.codigo}</td>
                  <td className="table-cell px-2 font-medium">{p.placa}<span className="block text-xs text-cv-muted">{p.marca} {p.modelo}</span></td>
                  <td className="table-cell px-2 text-cv-muted text-sm">{p.solicitante_nombre || '—'}</td>
                  <td className="table-cell px-2">{p.tipo_servicio}</td>
                  <td className="table-cell px-2 max-w-[220px]"><span className="line-clamp-2 text-cv-muted block">{p.descripcion || '—'}</span></td>
                  <td className="table-cell px-2">{p.km_actual != null ? Number(p.km_actual).toLocaleString() : '—'}</td>
                  <td className="table-cell px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[p.estado] || ''}`}>{p.estado}</span>
                  </td>
                  <td className="table-cell px-2 text-cv-muted text-sm">{fmtFecha(p.fecha)}</td>
                  {esAdmin && (
                    <td className="table-cell px-2">
                      {esPendiente(p) ? (
                        <div className="flex gap-2">
                          <button onClick={() => atender(p.id)} className="btn-primary !py-1 !px-3 text-xs justify-center"><Check className="w-3.5 h-3.5" /> Aprobar</button>
                          <button onClick={() => rechazar(p.id)} className="btn-secondary !py-1 !px-3 text-xs justify-center text-red-400"><XIcon className="w-3.5 h-3.5" /> Rechazar</button>
                        </div>
                      ) : <span className="text-cv-muted text-xs">Atendido</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!pedidos.length && (
          <p className="text-center text-cv-muted py-8">No hay pedidos para mostrar</p>
        )}
      </div>

      {/* Modal nuevo pedido */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full animate-slide-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-cv-text font-semibold capitalize">Nuevo Pedido de {tab}</h3>
              <button onClick={() => setModal(false)} className="text-cv-muted hover:text-cv-text"><XIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={savePedido} className="space-y-4">
              <div>
                <label className="block text-cv-muted text-sm mb-1">Vehículo *</label>
                <select className="select" value={form.vehiculo_id}
                  onChange={e => {
                    const v = vehiculos.find(x => x.id === Number(e.target.value));
                    setForm({ ...form, vehiculo_id: e.target.value, km_actual: v?.kilometraje_actual ?? form.km_actual });
                  }} required>
                  <option value="">Selecciona un vehículo</option>
                  {vehiculos.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>
              {tab === 'combustible' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-cv-muted text-sm mb-1">Galones solicitados *</label>
                      <input type="number" step="0.01" min="0.01" className="input" value={form.litros}
                        onChange={e => setForm({ ...form, litros: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-cv-muted text-sm mb-1">Tipo</label>
                      <select className="select" value={form.tipo_combustible} onChange={e => setForm({ ...form, tipo_combustible: e.target.value })}>
                        {['Gasolina', 'Corriente', 'Extra', 'Diesel', 'ACPM'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-cv-muted text-sm mb-1">KM actuales *</label>
                    <input type="number" min="0" className="input" value={form.km_actual}
                      onChange={e => setForm({ ...form, km_actual: e.target.value })} required />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-cv-muted text-sm mb-1">KM actuales *</label>
                    <input type="number" min="0" className="input" value={form.km_actual}
                      onChange={e => setForm({ ...form, km_actual: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-cv-muted text-sm mb-1">¿Qué necesita el vehículo?</label>
                    <textarea className="input min-h-[80px]" maxLength={500} value={form.observaciones}
                      onChange={e => setForm({ ...form, observaciones: e.target.value })}
                      placeholder="Ej: cambio de aceite y filtros" />
                  </div>
                </>
              )}
              {!esAdmin && (
                <p className="text-xs text-cv-muted bg-cv-border/20 rounded-lg p-3">
                  Tu pedido será revisado y aprobado por un administrador antes de ejecutarse.
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Enviando...' : 'Enviar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
