import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck, Fuel, Wrench, XCircle, CheckCircle, Users, Plus, X } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function VehiculoPerfilPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'
  const [vehiculo, setVehiculo] = useState(null)
  const [historialComb, setHistorialComb] = useState([])
  const [mantenimientos, setMantenimientos] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [asignarUsuarioId, setAsignarUsuarioId] = useState('')
  const [tab, setTab] = useState('info')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, histRes, mantRes] = await Promise.all([
          api.get(`/vehiculos/${id}`),
          api.get(`/vehiculos/${id}/historial-combustible`),
          api.get(`/vehiculos/${id}/mantenimientos`)
        ])
        setVehiculo(vehRes.data)
        setHistorialComb(histRes.data)
        setMantenimientos(mantRes.data)

        if (isAdmin) {
          const [asigRes, usuRes] = await Promise.all([
            api.get('/asignaciones', { params: { vehiculo_id: id } }),
            api.get('/usuarios')
          ])
          setAsignaciones(asigRes.data)
          setUsuarios(usuRes.data)
        }
      } catch (error) {
        toast.error('Error al cargar datos del vehiculo')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const getEstadoBadge = (estado) => {
    const map = { 'Activo': 'badge-success', 'Inactivo': 'badge-danger', 'En Mantenimiento': 'badge-warning',
      'Pendiente': 'badge-warning', 'Aprobada': 'badge-info', 'Rechazada': 'badge-danger', 'Surtida': 'badge-success',
      'Programado': 'badge-warning', 'En Proceso': 'badge-info', 'Completado': 'badge-success', 'Cancelado': 'badge-danger' }
    return map[estado] || 'badge-secondary'
  }

  const cargarAsignaciones = async () => {
    try {
      const { data } = await api.get('/asignaciones', { params: { vehiculo_id: id } })
      setAsignaciones(data)
    } catch (e) {
      toast.error('Error al cargar asignaciones')
    }
  }

  const handleAsignar = async (e) => {
    e.preventDefault()
    if (!asignarUsuarioId) return
    try {
      await api.post('/asignaciones', { usuario_id: asignarUsuarioId, vehiculo_id: parseInt(id) })
      toast.success('Usuario asignado exitosamente')
      setShowAsignarModal(false)
      setAsignarUsuarioId('')
      cargarAsignaciones()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al asignar usuario')
    }
  }

  const handleRemoveAsignacion = async (asignacionId) => {
    if (!window.confirm('Remover esta asignacion?')) return
    try {
      await api.delete(`/asignaciones/${asignacionId}`)
      toast.success('Asignacion removida')
      cargarAsignaciones()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al remover asignacion')
    }
  }

  if (loading) return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando vehiculo...</div>
  if (!vehiculo) return <div className="text-center text-muted" style={{ padding: '60px' }}>Vehiculo no encontrado</div>

  const chartData = {
    labels: historialComb.filter(h => h.estado === 'Surtida').map(h =>
      new Date(h.fecha_solicitud).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    ),
    datasets: [{
      label: 'Galones Surtidos',
      data: historialComb.filter(h => h.estado === 'Surtida').map(h => parseFloat(h.galones_surtidos) || 0),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } }
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/vehiculos')}>
          <ArrowLeft size={16} /> Volver
        </button>
        {isAdmin && (
          <button className={`btn btn-sm ${vehiculo.estado === 'Activo' ? 'btn-danger' : 'btn-success'}`}
            style={{ marginLeft: 'auto' }}
            onClick={async () => {
              const nuevo = vehiculo.estado === 'Activo' ? 'Inactivo' : 'Activo'
              if (!window.confirm(`Cambiar estado a "${nuevo}"?`)) return
              try {
                const { data } = await api.delete(`/vehiculos/${vehiculo.id}`)
                setVehiculo(prev => ({ ...prev, estado: data.estado, activo: data.estado === 'Activo' ? 1 : 0 }))
                toast.success(data.mensaje)
              } catch (e) {
                toast.error(e.response?.data?.error || 'Error al cambiar estado')
              }
            }}>
            {vehiculo.estado === 'Activo' ? <XCircle size={14} /> : <CheckCircle size={14} />}
            {' '}{vehiculo.estado === 'Activo' ? 'Inactivar' : 'Activar'}
          </button>
        )}
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="kpi-icon blue"><Truck size={32} /></div>
          <div>
            <h1 style={{ fontSize: 22 }}>{vehiculo.marca} {vehiculo.modelo}</h1>
            <p className="text-muted">
              {vehiculo.placa} - {vehiculo.tipo_vehiculo?.nombre} - {vehiculo.ano}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className={`badge ${getEstadoBadge(vehiculo.estado)}`} style={{ fontSize: 13, padding: '6px 16px' }}>{vehiculo.estado}</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
          Informacion General
        </button>
        <button className={`tab ${tab === 'combustible' ? 'active' : ''}`} onClick={() => setTab('combustible')}>
          <Fuel size={16} style={{ marginRight: 6 }} /> Historial Combustible
        </button>
        <button className={`tab ${tab === 'mantenimientos' ? 'active' : ''}`} onClick={() => setTab('mantenimientos')}>
          <Wrench size={16} style={{ marginRight: 6 }} /> Mantenimientos
        </button>
        {isAdmin && (
          <button className={`tab ${tab === 'asignaciones' ? 'active' : ''}`} onClick={() => setTab('asignaciones')}>
            <Users size={16} style={{ marginRight: 6 }} /> Asignaciones
          </button>
        )}
      </div>

      {tab === 'info' && (
        <div className="card">
          <div className="grid-3">
            <div className="form-group"><label>Placa</label><p style={{ fontWeight: 600 }}>{vehiculo.placa}</p></div>
            <div className="form-group"><label>Marca</label><p>{vehiculo.marca}</p></div>
            <div className="form-group"><label>Modelo</label><p>{vehiculo.modelo}</p></div>
            <div className="form-group"><label>Año</label><p>{vehiculo.ano}</p></div>
            <div className="form-group"><label>Tipo</label><p>{vehiculo.tipo_vehiculo?.nombre}</p></div>
            <div className="form-group"><label>Color</label><p>{vehiculo.color || 'N/A'}</p></div>
            <div className="form-group"><label>Capacidad Combustible</label><p>{vehiculo.capacidad_combustible ? `${vehiculo.capacidad_combustible} galones` : 'N/A'}</p></div>
            <div className="form-group"><label>Kilometraje Actual</label><p>{parseFloat(vehiculo.kilometraje_actual).toLocaleString()} km</p></div>
            <div className="form-group"><label>No. Motor</label><p>{vehiculo.numero_motor || 'N/A'}</p></div>
            <div className="form-group"><label>No. Chasis</label><p>{vehiculo.numero_chasis || 'N/A'}</p></div>
            <div className="form-group"><label>Estado</label><p><span className={`badge ${getEstadoBadge(vehiculo.estado)}`}>{vehiculo.estado}</span></p></div>
          </div>
        </div>
      )}

      {tab === 'combustible' && (
        <div>
          {historialComb.filter(h => h.estado === 'Surtida').length > 0 && (
            <div className="chart-container mb-6">
              <h3>Consumo de Combustible</h3>
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
          <div className="card">
            <h3 className="mb-4">Historial de Solicitudes</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Fecha</th>
                    <th>Solicitado</th>
                    <th>Surtido</th>
                    <th>Costo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historialComb.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 40 }}>Sin solicitudes de combustible</td></tr>
                  ) : historialComb.map(h => (
                    <tr key={h.id}>
                      <td><strong>{h.codigo}</strong></td>
                      <td>{new Date(h.fecha_solicitud).toLocaleDateString('es-ES')}</td>
                      <td>{parseFloat(h.galones_solicitados).toFixed(2)} gal</td>
                      <td>{h.galones_surtidos ? `${parseFloat(h.galones_surtidos).toFixed(2)} gal` : '-'}</td>
                      <td>{h.costo_total ? `Q${parseFloat(h.costo_total).toFixed(2)}` : '-'}</td>
                      <td><span className={`badge ${getEstadoBadge(h.estado)}`}>{h.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'asignaciones' && isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ margin: 0 }}>Usuarios Asignados</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setShowAsignarModal(true)}>
              <Plus size={14} /> Asignar Usuario
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Asignado Desde</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {asignaciones.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 40 }}>Sin usuarios asignados</td></tr>
                ) : asignaciones.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.usuario?.nombre} {a.usuario?.apellido}</strong></td>
                    <td>{a.usuario?.email}</td>
                    <td><span className="badge badge-info">{a.usuario?.rol?.nombre}</span></td>
                    <td className="text-sm">{new Date(a.created_at).toLocaleDateString('es-ES')}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveAsignacion(a.id)}>
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showAsignarModal && (
            <div className="modal-overlay" onClick={() => setShowAsignarModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                <h2>Asignar Usuario</h2>
                <form onSubmit={handleAsignar}>
                  <div className="form-group">
                    <label>Seleccionar Usuario *</label>
                    <select value={asignarUsuarioId} onChange={e => setAsignarUsuarioId(e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      {usuarios.filter(u =>
                        !asignaciones.find(a => a.usuario_id === u.id)
                      ).map(u => (
                        <option key={u.id} value={u.id}>{u.nombre} {u.apellido} - {u.rol?.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAsignarModal(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Asignar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'mantenimientos' && (
        <div className="card">
          <h3 className="mb-4">Historial de Mantenimientos</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Tipo</th>
                  <th>Fecha Programada</th>
                  <th>Fecha Realizada</th>
                  <th>Costo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientos.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 40 }}>Sin mantenimientos registrados</td></tr>
                ) : mantenimientos.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.codigo}</strong></td>
                    <td>{m.tipo_mantenimiento?.nombre}</td>
                    <td>{m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString('es-ES') : '-'}</td>
                    <td>{m.fecha_realizada ? new Date(m.fecha_realizada).toLocaleDateString('es-ES') : '-'}</td>
                    <td>{m.costo ? `Q${parseFloat(m.costo).toFixed(2)}` : '-'}</td>
                    <td><span className={`badge ${getEstadoBadge(m.estado)}`}>{m.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
