import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save, Shield } from 'lucide-react';

const ROLES = ['admin', 'operador', 'cajero'];
const EMPTY = { nombre: '', username: '', email: '', rol: 'operador', password: '', activo: 1 };
const ROL_COLORS = { admin: 'text-red-400 bg-red-900/30', operador: 'text-blue-400 bg-blue-900/30', cajero: 'text-green-400 bg-green-900/30' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    try { const r = await api.get('/usuarios'); setUsuarios(r.data); } catch {}
  };
  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (u) => { setForm({ ...u, password: '' }); setEditId(u.id); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) { await api.put(`/usuarios/${editId}`, form); toast.success('Usuario actualizado'); }
      else { await api.post('/usuarios', form); toast.success('Usuario creado'); }
      setModal(false);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally { setLoading(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('¿Desactivar usuario?')) return;
    await api.delete(`/usuarios/${id}`);
    toast.success('Usuario desactivado');
    fetch();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-park-text font-semibold text-lg">Gestión de Usuarios</h2>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Usuario</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-park-border">
              {['Usuario', 'Username', 'Email', 'Rol', 'Estado', ''].map(h => (
                <th key={h} className="table-header text-left pb-3 px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className="hover:bg-park-border/10 transition-colors">
                <td className="table-cell px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-park-primary flex items-center justify-center text-park-accent font-bold text-sm shrink-0">{u.nombre[0]}</div>
                    <span className="font-medium">{u.nombre}</span>
                  </div>
                </td>
                <td className="table-cell px-2 font-mono text-park-muted">{u.username}</td>
                <td className="table-cell px-2 text-park-muted">{u.email || '—'}</td>
                <td className="table-cell px-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${ROL_COLORS[u.rol] || 'text-park-muted'}`}>
                    <Shield className="w-3 h-3" /> {u.rol}
                  </span>
                </td>
                <td className="table-cell px-2">
                  {u.activo ? <span className="badge-libre">Activo</span> : <span className="badge-mant">Inactivo</span>}
                </td>
                <td className="table-cell px-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-park-muted hover:text-park-accent transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deactivate(u.id)} className="text-park-muted hover:text-park-ocupado transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!usuarios.length && <p className="text-center text-park-muted py-8">No hay usuarios</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-park-text font-semibold">{editId ? 'Editar' : 'Nuevo'} Usuario</h3>
              <button onClick={() => setModal(false)} className="text-park-muted hover:text-park-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div><label className="block text-park-muted text-sm mb-1">Nombre completo *</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-park-muted text-sm mb-1">Username *</label><input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={!!editId} /></div>
                <div>
                  <label className="block text-park-muted text-sm mb-1">Rol</label>
                  <select className="select" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-park-muted text-sm mb-1">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <label className="block text-park-muted text-sm mb-1">{editId ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editId} />
              </div>
              {editId && (
                <div className="flex items-center gap-3">
                  <label className="text-park-muted text-sm">Estado:</label>
                  <button type="button" onClick={() => setForm({ ...form, activo: form.activo ? 0 : 1 })}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${form.activo ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                    {form.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  <Save className="w-4 h-4" /> {loading ? '...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
