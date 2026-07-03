import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, XCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../services/api'

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState([])
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'
  const navigate = useNavigate()

  const [form, setForm] = useState({
    placa: '', marca: '', modelo: '', ano: new Date().getFullYear(),
    tipo_vehiculo_id: '', capacidad_combustible: '', color: '',
    numero_motor: '', numero_chasis: '', kilometraje_actual: '', estado: 'Activo'
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, tipRes] = await Promise.all([
          api.get('/vehiculos'),
          api.get('/tipos-vehiculo')
        ])
        setVehiculos(vehRes.data)
        setTipos(tipRes.data)
      } catch (error) {
        toast.error('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const vehiculosFiltrados = vehiculos.filter(v => {
    if (filtroEstado && v.estado !== filtroEstado) return false
    if (filtroTipo && v.tipo_vehiculo_id !== parseInt(filtroTipo)) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!v.placa.toLowerCase().includes(q) &&
          !v.marca.toLowerCase().includes(q) &&
          !v.modelo.toLowerCase().includes(q)) return false
    }
    return true
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ placa: '', marca: '', modelo: '', ano: new Date().getFullYear(), tipo_vehiculo_id: '', capacidad_combustible: '', color: '', numero_motor: '', numero_chasis: '', kilometraje_actual: '', estado: 'Activo' })
    setShowModal(true)
  }

  const openEdit = (v) => {
    setEditing(v)
    setForm({
      placa: v.placa, marca: v.marca, modelo: v.modelo, ano: v.ano,
      tipo_vehiculo_id: v.tipo_vehiculo_id, capacidad_combustible: v.capacidad_combustible || '',
      color: v.color || '', numero_motor: v.numero_motor || '', numero_chasis: v.numero_chasis || '',
      kilometraje_actual: v.kilometraje_actual, estado: v.estado
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/vehiculos/${editing.id}`, form)
        setVehiculos(prev => prev.map(v => v.id === editing.id ? data : v))
        toast.success('Vehiculo actualizado')
      } else {
        const { data } = await api.post('/vehiculos', form)
        setVehiculos(prev => [data, ...prev])
        toast.success('Vehiculo creado')
      }
      setShowModal(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar vehiculo')
    }
  }

  const handleToggleEstado = async (v) => {
    const nuevo = v.estado === 'Activo' ? 'Inactivo' : 'Activo'
    if (!window.confirm(`Cambiar estado a "${nuevo}"?`)) return
    try {
      const { data } = await api.delete(`/vehiculos/${v.id}`)
      setVehiculos(prev => prev.map(x => x.id === v.id ? { ...x, estado: data.estado, activo: data.estado === 'Activo' ? 1 : 0 } : x))
      toast.success(data.mensaje)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cambiar estado')
    }
  }

  const getEstadoBadge = (estado) => {
    const map = { 'Activo': 'badge-success', 'Inactivo': 'badge-danger', 'En Mantenimiento': 'badge-warning' }
    return map[estado] || 'badge-secondary'
  }

  if (loading) {
    return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando vehiculos...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Vehículos</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> Nuevo Vehiculo
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Buscar placa, marca, modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
          <option value="En Mantenimiento">En Mantenimiento</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Marca / Modelo</th>
                <th>Año</th>
                <th>Tipo</th>
                <th>Kilometraje</th>
                <th>Estado</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {vehiculosFiltrados.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center text-muted" style={{ padding: '40px' }}>No hay vehiculos registrados</td></tr>
              ) : vehiculosFiltrados.map(v => (
                <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/vehiculos/${v.id}`)}>
                  <td><strong>{v.placa}</strong></td>
                  <td>{v.marca} {v.modelo}</td>
                  <td>{v.ano}</td>
                  <td><span className="badge badge-info">{v.tipo_vehiculo?.nombre}</span></td>
                  <td>{parseFloat(v.kilometraje_actual).toLocaleString()} km</td>
                  <td><span className={`badge ${getEstadoBadge(v.estado)}`}>{v.estado}</span></td>
                  {isAdmin && (
                    <td>
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(v)}><Edit size={14} /></button>
                        <button className={`btn btn-sm ${v.estado === 'Activo' ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleEstado(v)}>
                          {v.estado === 'Activo' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Editar Vehiculo' : 'Nuevo Vehiculo'}</h2>
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Placa *</label>
                  <input value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Tipo *</label>
                  <select value={form.tipo_vehiculo_id} onChange={e => setForm({ ...form, tipo_vehiculo_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Marca *</label>
                  <input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Modelo *</label>
                  <input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Año *</label>
                  <input type="number" value={form.ano} onChange={e => setForm({ ...form, ano: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Capacidad Combustible (galones)</label>
                  <input type="number" step="0.01" value={form.capacidad_combustible} onChange={e => setForm({ ...form, capacidad_combustible: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Kilometraje Actual</label>
                  <input type="number" step="0.01" value={form.kilometraje_actual} onChange={e => setForm({ ...form, kilometraje_actual: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>No. Motor</label>
                  <input value={form.numero_motor} onChange={e => setForm({ ...form, numero_motor: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>No. Chasis</label>
                  <input value={form.numero_chasis} onChange={e => setForm({ ...form, numero_chasis: e.target.value })} />
                </div>
                {editing && (
                  <div className="form-group">
                    <label>Estado</label>
                    <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="En Mantenimiento">En Mantenimiento</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
