import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save, UserCircle } from 'lucide-react';

const EMPTY = { nombre: '', cedula: '', telefono: '', email: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [busq, setBusq] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const res = await api.get('/clientes');
    setClientes(res.data);
  };
  useEffect(() => { fetch(); }, []);

  const filtrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busq.toLowerCase()) ||
    c.cedula?.includes(busq)
  );

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (c) => {
    setForm({ nombre: c.nombre || '', cedula: c.cedula || '', telefono: c.telefono || '', email: c.email || '' });
    setEditId(c.id);
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre,
        cedula: form.cedula || null,
        telefono: form.telefono || null,
        email: form.email || null,
      };
      if (editId) { await api.put(`/clientes/${editId}`, { ...payload, activo: 1 }); toast.success('Cliente actualizado'); }
      else { await api.post('/clientes', payload); toast.success('Cliente registrado'); }
      setModal(false);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm('¿Desactivar cliente?')) return;
    await api.delete(`/clientes/${id}`);
    toast.success('Cliente desactivado');
    fetch();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <input className="input max-w-sm" placeholder="Buscar por nombre o cédula..." value={busq} onChange={e => setBusq(e.target.value)} />
        <button onClick={openAdd} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Nuevo Cliente</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-park-border">
              {['Cliente', 'Cédula', 'Teléfono', 'Email', ''].map(h => (
                <th key={h} className="table-header text-left pb-3 px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id} className="hover:bg-park-border/10 transition-colors">
                <td className="table-cell px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-park-primary flex items-center justify-center text-park-accent font-bold text-sm shrink-0">
                      {c.nombre[0]}
                    </div>
                    <div>
                      <p className="font-medium text-park-text">{c.nombre}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell px-2 text-park-muted">{c.cedula || '—'}</td>
                <td className="table-cell px-2 text-park-muted">{c.telefono || '—'}</td>
                <td className="table-cell px-2 text-park-muted">{c.email || '—'}</td>
                <td className="table-cell px-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="text-park-muted hover:text-park-accent transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(c.id)} className="text-park-muted hover:text-park-ocupado transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtrados.length && <p className="text-center text-park-muted py-8">No se encontraron clientes</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full animate-slide-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-park-text font-semibold flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-park-accent" /> {editId ? 'Editar' : 'Nuevo'} Cliente
              </h3>
              <button onClick={() => setModal(false)} className="text-park-muted hover:text-park-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-park-muted text-sm mb-1">Nombre *</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div><label className="block text-park-muted text-sm mb-1">Cédula</label><input className="input" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} /></div>
                <div><label className="block text-park-muted text-sm mb-1">Teléfono</label><input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                <div><label className="block text-park-muted text-sm mb-1">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
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
