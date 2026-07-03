import { useState, useEffect } from 'react'
import { Users, Truck, Plus, X, Search, Check, Clock, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../services/api'

export default function AsignacionesPage() {
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'

  if (isAdmin) return <AdminView />
  return <EmployeeView />
}

function AdminView() {
  const [asignaciones, setAsignaciones] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [usuarioId, setUsuarioId] = useState('')
  const [vehiculoId, setVehiculoId] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [asigRes, usuRes, vehRes] = await Promise.all([
          api.get('/asignaciones'),
          api.get('/usuarios'),
          api.get('/vehiculos')
        ])
        setAsignaciones(asigRes.data)
        setUsuarios(usuRes.data)
        setVehiculos(vehRes.data)
      } catch (error) {
        toast.error('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleAsignar = async (e) => {
    e.preventDefault()
    if (!usuarioId || !vehiculoId) return
    try {
      const { data } = await api.post('/asignaciones', {
        usuario_id: parseInt(usuarioId),
        vehiculo_id: parseInt(vehiculoId)
      })
      setAsignaciones(prev => [data, ...prev])
      toast.success('Vehículo asignado exitosamente')
      setShowModal(false)
      setUsuarioId('')
      setVehiculoId('')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al asignar')
    }
  }

  const handleRemover = async (id) => {
    if (!window.confirm('¿Remover esta asignación?')) return
    try {
      await api.delete(`/asignaciones/${id}`)
      setAsignaciones(prev => prev.filter(a => a.id !== id))
      toast.success('Asignación removida')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al remover')
    }
  }

  const filtrados = asignaciones.filter(a => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      a.usuario?.nombre?.toLowerCase().includes(q) ||
      a.usuario?.apellido?.toLowerCase().includes(q) ||
      a.vehiculo?.placa?.toLowerCase().includes(q) ||
      a.vehiculo?.marca?.toLowerCase().includes(q)
    )
  })

  const usuariosDisponibles = usuarios.filter(u =>
    u.activo && (u.rol?.nombre === 'Empleado' || u.rol?.nombre === 'Administrador')
  )

  if (loading) {
    return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando asignaciones...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Asignaciones</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Asignar Vehículo
        </button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-icon blue"><Users size={24} /></div>
          <div className="kpi-info">
            <h3>{asignaciones.length}</h3>
            <p>Asignaciones</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><Truck size={24} /></div>
          <div className="kpi-info">
            <h3>{new Set(asignaciones.map(a => a.vehiculo_id)).size}</h3>
            <p>Vehículos Asignados</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><Users size={24} /></div>
          <div className="kpi-info">
            <h3>{new Set(asignaciones.map(a => a.usuario_id)).size}</h3>
            <p>Empleados Asignados</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Buscar por vehículo o empleado..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Vehículo</th>
                <th>Placa</th>
                <th>Asignado Desde</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 60 }}>{busqueda ? 'Sin resultados' : 'No hay asignaciones'}</td></tr>
              ) : filtrados.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.usuario?.nombre} {a.usuario?.apellido}</strong></td>
                  <td>{a.vehiculo?.marca} {a.vehiculo?.modelo}</td>
                  <td><span className="badge badge-info">{a.vehiculo?.placa}</span></td>
                  <td className="text-sm">{new Date(a.created_at).toLocaleDateString('es-ES')}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemover(a.id)}>
                      <X size={14} /> Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h2>Asignar Vehículo</h2>
            <form onSubmit={handleAsignar}>
              <div className="form-group">
                <label>Empleado *</label>
                <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)} required>
                  <option value="">Seleccionar empleado...</option>
                  {usuariosDisponibles.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.email}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Vehículo *</label>
                <select value={vehiculoId} onChange={e => setVehiculoId(e.target.value)} required>
                  <option value="">Seleccionar vehículo...</option>
                  {vehiculos.filter(v => v.activo).map(v => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo} ({v.ano})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Asignar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function EmployeeView() {
  const { usuario } = useAuthStore()
  const [misVehiculos, setMisVehiculos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/asignaciones/mis-vehiculos')
        setMisVehiculos(data)
      } catch (error) {
        toast.error('Error al cargar tus vehiculos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando tus vehiculos...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Mis Vehículos</h1>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-icon green"><Truck size={24} /></div>
          <div className="kpi-info">
            <h3>{misVehiculos.length}</h3>
            <p>Vehículos Asignados</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">Mis Vehículos Asignados</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Marca / Modelo</th>
                <th>Año</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {misVehiculos.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 40 }}>No tienes vehículos asignados</td></tr>
              ) : misVehiculos.map(v => (
                <tr key={v.id}>
                  <td><span className="badge badge-info" style={{ fontSize: 13 }}>{v.placa}</span></td>
                  <td><strong>{v.marca} {v.modelo}</strong></td>
                  <td>{v.ano || '-'}</td>
                  <td><span className="badge badge-info">{v.tipo_vehiculo?.nombre}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
