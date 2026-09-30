import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useRealTime } from '../api/realtime';
import toast from '../components/toastStore';
import { Plus, X, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TIPOS = ['Mecánica', 'Eléctrica', 'Llantas', 'Frenos', 'Carrocería', 'Fuga', 'Otro'];
const ESTADOS = ['Pendiente', 'En revisión', 'Resuelta', 'Descartada'];

const SEV_COLORS = {
  baja: 'text-emerald-400 bg-emerald-900/30',
  media: 'text-amber-400 bg-amber-900/30',
  alta: 'text-red-400 bg-red-900/30'
};
const ESTADO_COLORS = {
  Pendiente: 'text-amber-400 bg-amber-900/30',   
  'En revisión': 'text-blue-400 bg-blue-900/30',
  Resuelta: 'text-emerald-400 bg-emerald-900/30',
  Descartada: 'text-cv-muted bg-cv-border/30'
};

const EMPTY_FORM = { vehiculo_id: '', tipo: 'Otro', severidad: 'media', descripcion: '', foto: null };

export default function Anomalias() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  const [anomalias, setAnomalias] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  

  const fetchAnomalias = useCallback(async () => {
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      const r = await api.get('/anomalias', { params });
      setAnomalias(r.data || []);
    } catch {
      toast.error('Error al cargar anomalías');
    }
  }, [filtroEstado]);

  useEffect(() => { fetchAnomalias(); }, [fetchAnomalias]);
  useEffect(() => {
    api.get('/vehiculos').then(r => setVehiculos(r.data || [])).catch(() => {});
  }, []);


  useRealTime('anomalia', () => { fetchAnomalias(); });

  const openAdd = () => { setForm(EMPTY_FORM); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.vehiculo_id) return toast.error('Selecciona un vehículo');
    setSaving(true);
    try {
      let foto_url = null;
      if (form.foto) {
        const fd = new FormData();
        fd.append('foto', form.foto);
        const up = await api.post('/upload/anomalia', fd);
        foto_url = up.data.url;
      }
      await api.post('/anomalias', {
        vehiculo_id: form.vehiculo_id,
        tipo: form.tipo,
        severidad: form.severidad,
        descripcion: form.descripcion,
        foto_url
      });
      toast.success('Anomalía reportada');
      setModal(false);
      fetchAnomalias();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reportar');
    } finally { setSaving(false); }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await api.put(`/anomalias/${id}/estado`, { estado });
      toast.success('Estado actualizado');
      fetchAnomalias();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta anomalía?')) return;
    try {
      await api.delete(`/anomalias/${id}`);
      toast.success('Anomalía eliminada');
      fetchAnomalias();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-cv-text font-semibold text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" /> Reporte de Anomalías
        </h2>
        <div className="flex gap-2 items-center">
          {esAdmin && (
            <select className="select w-auto" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Reportar</button>
        </div>
      </div>
      
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cv-border">
              {['Código', 'Vehículo', 'Reportado por', 'Tipo', 'Severidad', 'Descripción', 'Estado', esAdmin ? 'Acciones' : ''].map(h => (
                <th key={h} className="table-header text-left pb-3 px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {anomalias.map(a => (
              <tr key={a.id} className="hover:bg-cv-border/10 transition-colors">
                <td className="table-cell px-2 font-mono text-xs text-cv-muted">{a.codigo}</td>
                <td className="table-cell px-2 font-medium">
                  {a.placa}
                  <span className="block text-xs text-cv-muted">{a.marca} {a.modelo}</span>
                </td>
                <td className="table-cell px-2 text-cv-muted text-sm">{a.reportado_por || '—'}</td>
                <td className="table-cell px-2">{a.tipo}</td>
                <td className="table-cell px-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SEV_COLORS[a.severidad]}`}>{a.severidad}</span>
                </td>
                <td className="table-cell px-2 max-w-[260px]">
                  <span className="line-clamp-2 text-cv-muted block">{a.descripcion}</span>
                  {a.foto_url && /^https?:\/\//.test(a.foto_url) && <a href={a.foto_url} target="_blank" rel="noreferrer" className="text-cv-accent text-xs hover:underline">Ver foto</a>}
                </td>
                <td className="table-cell px-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[a.estado] || ''}`}>{a.estado}</span>
                </td>
                {esAdmin && (
                  <td className="table-cell px-2">
                    <div className="flex items-center gap-2">
                      <select className="select w-auto text-xs py-1" value={a.estado} onChange={e => cambiarEstado(a.id, e.target.value)}>
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <button onClick={() => eliminar(a.id)} className="text-cv-muted hover:text-cv-danger p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!anomalias.length && (
          <p className="text-center text-cv-muted py-8">No hay anomalías reportadas</p>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full animate-slide-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-cv-text font-semibold">Reportar Anomalía</h3>
              <button onClick={() => setModal(false)} className="text-cv-muted hover:text-cv-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-cv-muted text-sm mb-1">Vehículo *</label>
                <select className="select" value={form.vehiculo_id} onChange={e => setForm({ ...form, vehiculo_id: e.target.value })} required>
                  <option value="">Selecciona un vehículo</option>
                  {vehiculos.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cv-muted text-sm mb-1">Tipo</label>
                  <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-cv-muted text-sm mb-1">Severidad</label>
                  <select className="select capitalize" value={form.severidad} onChange={e => setForm({ ...form, severidad: e.target.value })}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-cv-muted text-sm mb-1">Descripción *</label>
                <textarea className="input min-h-[90px]" maxLength={1000} value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
              </div>
              <div>
                <label className="block text-cv-muted text-sm mb-1">Foto (opcional)</label>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="input"
                  onChange={e => {
                    const f = e.target.files[0] || null;
                    if (f && f.size > 5 * 1024 * 1024) { toast.error('Máximo 5 MB'); e.target.value=''; return; }
                    if (f && !['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)) { toast.error('Formato no admitido'); e.target.value=''; return; }
                    setForm({ ...form, foto: f });
                  }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Enviando...' : 'Reportar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
