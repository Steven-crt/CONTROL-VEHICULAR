import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../services/api'

export default function SolicitudesCombustiblePage() {
  const [solicitudes, setSolicitudes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'

  const [form, setForm] = useState({ vehiculo_id: '', galones_solicitados: '', observaciones: '' })
  const [actionModal, setActionModal] = useState(null)
  const [actionForm, setActionForm] = useState({ galones_surtidos: '', costo_total: '', precio_por_galon: '', kilometraje_actual: '', observaciones: '' })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [solRes, vehRes] = await Promise.all([
          api.get('/solicitudes-combustible'),
          api.get('/vehiculos')
        ])
        setSolicitudes(solRes.data)
        setVehiculos(vehRes.data)
      } catch (error) {
        toast.error('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const solicitudesFiltradas = solicitudes.filter(s => {
    if (filtroEstado && s.estado !== filtroEstado) return false
    return true
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/solicitudes-combustible', {
        vehiculo_id: parseInt(form.vehiculo_id),
        galones_solicitados: parseFloat(form.galones_solicitados),
        observaciones: form.observaciones
      })
      setSolicitudes(prev => [data, ...prev])
      toast.success('Solicitud creada exitosamente')
      setShowModal(false)
      setForm({ vehiculo_id: '', galones_solicitados: '', observaciones: '' })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al crear solicitud')
    }
  }

  const handleAction = async (e) => {
    e.preventDefault()
    if (!actionModal) return
    try {
      const payload = {
        estado: actionModal.action,
        observaciones: actionForm.observaciones
      }
      if (actionModal.action === 'Surtida') {
        payload.galones_surtidos = parseFloat(actionForm.galones_surtidos)
        if (actionForm.costo_total) payload.costo_total = parseFloat(actionForm.costo_total)
        if (actionForm.precio_por_galon) payload.precio_por_galon = parseFloat(actionForm.precio_por_galon)
        if (actionForm.kilometraje_actual) payload.kilometraje_actual = parseFloat(actionForm.kilometraje_actual)
      }
      const { data } = await api.patch(`/solicitudes-combustible/${actionModal.id}/estado`, payload)
      setSolicitudes(prev => prev.map(s => s.id === actionModal.id ? data : s))
      toast.success(`Solicitud ${actionModal.action === 'Aprobada' ? 'aprobada' : actionModal.action === 'Rechazada' ? 'rechazada' : 'marcada como surtida'} exitosamente`)
      setActionModal(null)
      setActionForm({ galones_surtidos: '', costo_total: '', precio_por_galon: '', kilometraje_actual: '', observaciones: '' })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al procesar solicitud')
    }
  }

  const getBadge = (estado) => {
    const map = { 'Pendiente': 'badge-warning', 'Aprobada': 'badge-info', 'Rechazada': 'badge-danger', 'Surtida': 'badge-success' }
    return map[estado] || 'badge-secondary'
  }

  const openAction = (solicitud, action) => {
    setActionModal({ ...solicitud, action })
    setActionForm({
      galones_surtidos: action === 'Surtida' ? solicitud.galones_solicitados : '',
      costo_total: '', precio_por_galon: '', kilometraje_actual: solicitud.kilometraje_actual || '',
      observaciones: ''
    })
  }

  if (loading) {
    return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando solicitudes...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Solicitudes de Gasolina</h1>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Nueva Solicitud
          </button>
        )}
      </div>

      <div className="filter-bar">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Rechazada">Rechazada</option>
          <option value="Surtida">Surtida</option>
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Vehiculo</th>
                <th>Solicitante</th>
                <th>Galones Solicitados</th>
                <th>Galones Surtidos</th>
                <th>Costo</th>
                <th>Fecha</th>
                <th>Estado</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.length === 0 ? (
                <tr><td colSpan={isAdmin ? 9 : 8} className="text-center text-muted" style={{ padding: 40 }}>No hay solicitudes de combustible</td></tr>
              ) : solicitudesFiltradas.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.codigo}</strong></td>
                  <td>{s.vehiculo?.placa} - {s.vehiculo?.marca}</td>
                  <td>{s.solicitante?.nombre} {s.solicitante?.apellido}</td>
                  <td>{parseFloat(s.galones_solicitados).toFixed(2)}</td>
                  <td>{s.galones_surtidos ? parseFloat(s.galones_surtidos).toFixed(2) : '-'}</td>
                  <td>{s.costo_total ? `Q${parseFloat(s.costo_total).toFixed(2)}` : '-'}</td>
                  <td className="text-sm">{new Date(s.fecha_solicitud).toLocaleDateString('es-ES')}</td>
                  <td><span className={`badge ${getBadge(s.estado)}`}>{s.estado}</span></td>
                  {isAdmin && s.estado === 'Pendiente' && (
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-xs btn-success" onClick={() => openAction(s, 'Aprobada')}>Aprobar</button>
                        <button className="btn btn-xs btn-danger" onClick={() => openAction(s, 'Rechazada')}>Rechazar</button>
                      </div>
                    </td>
                  )}
                  {isAdmin && s.estado === 'Aprobada' && (
                    <td>
                      <button className="btn btn-xs btn-primary" onClick={() => openAction(s, 'Surtida')}>Surtir</button>
                    </td>
                  )}
                  {isAdmin && (s.estado === 'Surtida' || s.estado === 'Rechazada') && (
                    <td className="text-muted text-sm">-</td>
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
            <h2>Nueva Solicitud de Gasolina</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Vehiculo *</label>
                <select value={form.vehiculo_id} onChange={e => setForm({ ...form, vehiculo_id: e.target.value })} required>
                  <option value="">Seleccionar vehiculo...</option>
                  {vehiculos.filter(v => v.activo).map(v => (
                    <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Galones Solicitados *</label>
                <input type="number" step="0.01" min="0.01" value={form.galones_solicitados}
                  onChange={e => setForm({ ...form, galones_solicitados: e.target.value })} required placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Motivo de la solicitud..." />
              </div>
              <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>
              {actionModal.action === 'Aprobada' ? 'Aprobar Solicitud' :
               actionModal.action === 'Rechazada' ? 'Rechazar Solicitud' : 'Registrar Surtido'}
            </h2>
            <p className="text-sm text-muted mb-4">
              Solicitud #{actionModal.codigo} - {actionModal.vehiculo?.placa}
            </p>
            <form onSubmit={handleAction}>
              {actionModal.action === 'Surtida' && (
                <>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Galones Surtidos *</label>
                      <input type="number" step="0.01" value={actionForm.galones_surtidos}
                        onChange={e => setActionForm({ ...actionForm, galones_surtidos: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Precio por Galon</label>
                      <input type="number" step="0.01" value={actionForm.precio_por_galon}
                        onChange={e => setActionForm({ ...actionForm, precio_por_galon: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Costo Total</label>
                      <input type="number" step="0.01" value={actionForm.costo_total}
                        onChange={e => setActionForm({ ...actionForm, costo_total: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Kilometraje Actual</label>
                      <input type="number" step="0.01" value={actionForm.kilometraje_actual}
                        onChange={e => setActionForm({ ...actionForm, kilometraje_actual: e.target.value })} />
                    </div>
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Observaciones</label>
                <textarea value={actionForm.observaciones}
                  onChange={e => setActionForm({ ...actionForm, observaciones: e.target.value })}
                  placeholder="Comentarios..." />
              </div>
              <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancelar</button>
                <button type="submit" className={`btn ${actionModal.action === 'Rechazada' ? 'btn-danger' : 'btn-primary'}`}>
                  {actionModal.action === 'Aprobada' ? 'Aprobar' : actionModal.action === 'Rechazada' ? 'Rechazar' : 'Registrar Surtido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
