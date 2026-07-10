import { useState, useEffect } from 'react'
import { Plus, Wrench, AlertTriangle, CheckCircle, XCircle, Clock, Eye, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../services/api'

const STATUS_MAP = {
  Programado: { label: 'Programado', color: 'var(--warning)', icon: Clock },
  'En Proceso': { label: 'En Proceso', color: 'var(--info)', icon: Wrench },
  Completado: { label: 'Completado', color: 'var(--success)', icon: CheckCircle },
  Cancelado: { label: 'Cancelado', color: 'var(--danger)', icon: XCircle }
}

export default function MantenimientosPage() {
  const [mantenimientos, setMantenimientos] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [tiposMantenimiento, setTiposMantenimiento] = useState([])
  const [proximos, setProximos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [showComplete, setShowComplete] = useState(null)
  const [editing, setEditing] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'

  const [form, setForm] = useState({
    vehiculo_id: '', tipo_mantenimiento_id: '', descripcion: '',
    kilometraje_programado: '', fecha_programada: new Date().toISOString().split('T')[0],
    costo: '', proveedor: '', observaciones: ''
  })

  const [completeForm, setCompleteForm] = useState({
    kilometraje_realizado: '', costo: '', fecha_realizada: new Date().toISOString().split('T')[0],
    proveedor: '', factura: '', observaciones: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mantRes, vehRes, tipRes, proxRes] = await Promise.all([
          api.get('/mantenimientos'),
          api.get('/vehiculos'),
          api.get('/tipos-mantenimiento'),
          api.get('/mantenimientos/proximos')
        ])
        setMantenimientos(mantRes.data)
        setVehiculos(vehRes.data)
        setTiposMantenimiento(tipRes.data)
        setProximos(proxRes.data)
      } catch (error) {
        toast.error('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const stats = [
    { label: 'Programados', value: mantenimientos.filter(m => m.estado === 'Programado').length, color: '#f59e0b', icon: Clock },
    { label: 'En Proceso', value: mantenimientos.filter(m => m.estado === 'En Proceso').length, color: '#06b6d4', icon: Wrench },
    { label: 'Completados', value: mantenimientos.filter(m => m.estado === 'Completado').length, color: '#22c55e', icon: CheckCircle },
    { label: 'Cancelados', value: mantenimientos.filter(m => m.estado === 'Cancelado').length, color: '#ef4444', icon: XCircle }
  ]

  const openCreate = () => {
    setEditing(null)
    setForm({
      vehiculo_id: '', tipo_mantenimiento_id: '', descripcion: '',
      kilometraje_programado: '', fecha_programada: new Date().toISOString().split('T')[0],
      costo: '', proveedor: '', observaciones: ''
    })
    setShowModal(true)
  }

  const openEdit = (m) => {
    setEditing(m)
    setForm({
      vehiculo_id: m.vehiculo_id, tipo_mantenimiento_id: m.tipo_mantenimiento_id,
      descripcion: m.descripcion || '', kilometraje_programado: m.kilometraje_programado || '',
      fecha_programada: m.fecha_programada ? new Date(m.fecha_programada).toISOString().split('T')[0] : '',
      costo: m.costo || '', proveedor: m.proveedor || '', observaciones: m.observaciones || ''
    })
    setShowModal(true)
  }

  const openComplete = (m) => {
    setShowComplete(m)
    setCompleteForm({
      kilometraje_realizado: m.vehiculo?.kilometraje_actual || '',
      costo: m.costo || '',
      fecha_realizada: new Date().toISOString().split('T')[0],
      proveedor: m.proveedor || '',
      factura: '',
      observaciones: ''
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/mantenimientos/${editing.id}`, form)
        setMantenimientos(prev => prev.map(m => m.id === editing.id ? data : m))
        toast.success('Mantenimiento actualizado')
      } else {
        const { data } = await api.post('/mantenimientos', form)
        setMantenimientos(prev => [data, ...prev])
        toast.success('Mantenimiento creado')
      }
      setShowModal(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar mantenimiento')
    }
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    if (!showComplete) return
    try {
      const { data } = await api.put(`/mantenimientos/${showComplete.id}`, {
        ...completeForm,
        estado: 'Completado'
      })
      setMantenimientos(prev => prev.map(m => m.id === showComplete.id ? data : m))
      toast.success('Mantenimiento completado')
      setShowComplete(null)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al completar mantenimiento')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancelar este mantenimiento?')) return
    try {
      await api.delete(`/mantenimientos/${id}`)
      setMantenimientos(prev => prev.map(m => m.id === id ? { ...m, estado: 'Cancelado' } : m))
      toast.success('Mantenimiento cancelado')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cancelar')
    }
  }

  const getBadge = (estado) => {
    const map = { 'Programado': 'badge-warning', 'En Proceso': 'badge-info', 'Completado': 'badge-success', 'Cancelado': 'badge-danger' }
    return map[estado] || 'badge-secondary'
  }

  const tabTipos = ['', 'Programado', 'En Proceso', 'Completado', 'Cancelado']
  const tabLabels = ['Todos', 'Programado', 'En Proceso', 'Completado', 'Cancelado']

  const filtrados = mantenimientos.filter(m => {
    if (filtroEstado && m.estado !== filtroEstado) return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      m.codigo?.toLowerCase().includes(term) ||
      m.vehiculo?.placa?.toLowerCase().includes(term) ||
      m.vehiculo?.marca?.toLowerCase().includes(term) ||
      m.tipo_mantenimiento?.nombre?.toLowerCase().includes(term)
    )
  })

  if (loading) {
    return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando mantenimientos...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Mantenimientos</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> Nuevo Mantenimiento
          </button>
        )}
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon" style={{ background: `${s.color}20`, color: s.color }}>
              <s.icon size={24} />
            </div>
            <div className="kpi-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {proximos.length > 0 && (
        <div className="card mb-6" style={{ borderColor: 'var(--warning)' }}>
          <div className="flex items-center gap-4 mb-4">
            <AlertTriangle color="var(--warning)" size={24} />
            <h3 style={{ color: 'var(--warning)' }}>Mantenimientos Recomendados ({proximos.length})</h3>
          </div>
          <div className="table-container mobile-cards">
            <table>
              <thead>
                <tr>
                  <th>Vehiculo</th>
                  <th>Tipo Mantenimiento</th>
                  <th>Razon</th>
                  <th>Intervalo</th>
                  <th>Ultimo</th>
                </tr>
              </thead>
              <tbody>
                {proximos.slice(0, 5).map((p, i) => (
                  <tr key={i}>
                    <td data-label="Vehículo"><strong>{p.vehiculo.placa}</strong> - {p.vehiculo.marca}</td>
                    <td data-label="Tipo"><span className="badge badge-info">{p.tipo_mantenimiento.nombre}</span></td>
                    <td data-label="Razón" className="text-sm" style={{ color: 'var(--warning)' }}>{p.razon}</td>
                    <td data-label="Intervalo" className="text-sm text-muted">
                      {p.cada_km ? `Cada ${p.cada_km} km` : ''}
                      {p.cada_km && p.cada_dias ? ' / ' : ''}
                      {p.cada_dias ? `Cada ${p.cada_dias} dias` : ''}
                    </td>
                    <td data-label="Último" className="text-sm text-muted">
                      {p.ultimo_realizado ? new Date(p.ultimo_realizado).toLocaleDateString('es-ES') : 'Nunca'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {tabTipos.map((t, i) => (
            <button key={i} className={`tab ${filtroEstado === t ? 'active' : ''}`}
              onClick={() => setFiltroEstado(t)}>
              {tabLabels[i]}
            </button>
          ))}
        </div>
        <div className="search-box" style={{ width: 260 }}>
          <Search size={16} />
          <input placeholder="Buscar mantenimiento..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-container mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Vehiculo</th>
                <th>Tipo</th>
                <th>Fecha Prog.</th>
                <th>Fecha Real.</th>
                <th>Costo</th>
                <th>Estado</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={isAdmin ? 8 : 7} className="text-center text-muted" style={{ padding: 40 }}>
                  {searchTerm ? 'Sin resultados de busqueda' : 'No hay mantenimientos registrados'}
                </td></tr>
              ) : filtrados.map(m => (
                <tr key={m.id}>
                  <td data-label="Código"><strong>{m.codigo}</strong></td>
                  <td data-label="Vehículo">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'var(--bg-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', fontSize: 12, fontWeight: 600
                      }}>
                        {m.vehiculo?.placa?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm" style={{ fontWeight: 500 }}>{m.vehiculo?.placa}</div>
                        <div className="text-xs text-muted">{m.vehiculo?.marca} {m.vehiculo?.modelo}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Tipo"><span className="badge badge-info">{m.tipo_mantenimiento?.nombre}</span></td>
                  <td data-label="Fecha Prog." className="text-sm">{m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString('es-ES') : '-'}</td>
                  <td data-label="Fecha Real." className="text-sm">{m.fecha_realizada ? new Date(m.fecha_realizada).toLocaleDateString('es-ES') : '-'}</td>
                  <td data-label="Costo">{m.costo ? `Q${parseFloat(m.costo).toFixed(2)}` : '-'}</td>
                  <td data-label="Estado">
                    <div className="flex items-center gap-2">
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: STATUS_MAP[m.estado]?.color || 'var(--text-muted)',
                        display: 'inline-block'
                      }} />
                      <span className={`badge ${getBadge(m.estado)}`}>{m.estado}</span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td data-label="Acciones">
                      <div className="flex gap-2">
                        <button className="btn btn-xs btn-secondary" onClick={() => setShowDetail(m)}
                          title="Ver detalle">
                          <Eye size={12} />
                        </button>
                        {m.estado === 'Programado' && (
                          <>
                            <button className="btn btn-xs btn-success" onClick={() => openComplete(m)}>Completar</button>
                            <button className="btn btn-xs btn-secondary" onClick={() => openEdit(m)}>Editar</button>
                            <button className="btn btn-xs btn-danger" onClick={() => handleCancel(m.id)}>X</button>
                          </>
                        )}
                        {m.estado === 'En Proceso' && (
                          <button className="btn btn-xs btn-success" onClick={() => openComplete(m)}>Completar</button>
                        )}
                        {(m.estado === 'Completado' || m.estado === 'Cancelado') && (
                          <span className="text-muted text-sm">-</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ margin: 0 }}>Detalle #{showDetail.codigo}</h2>
              <span className={`badge ${getBadge(showDetail.estado)}`} style={{ fontSize: 13, padding: '4px 14px' }}>
                {showDetail.estado}
              </span>
            </div>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label>Vehiculo</label>
                <p className="text-sm" style={{ fontWeight: 500 }}>{showDetail.vehiculo?.placa} - {showDetail.vehiculo?.marca} {showDetail.vehiculo?.modelo}</p>
              </div>
              <div className="form-group">
                <label>Tipo Mantenimiento</label>
                <p className="text-sm">{showDetail.tipo_mantenimiento?.nombre}</p>
              </div>
              {showDetail.descripcion && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Descripcion</label>
                  <p className="text-sm">{showDetail.descripcion}</p>
                </div>
              )}
              <div className="form-group">
                <label>Fecha Programada</label>
                <p className="text-sm">{showDetail.fecha_programada ? new Date(showDetail.fecha_programada).toLocaleDateString('es-ES') : '-'}</p>
              </div>
              <div className="form-group">
                <label>Fecha Realizada</label>
                <p className="text-sm">{showDetail.fecha_realizada ? new Date(showDetail.fecha_realizada).toLocaleDateString('es-ES') : '-'}</p>
              </div>
              <div className="form-group">
                <label>Kilometraje Programado</label>
                <p className="text-sm">{showDetail.kilometraje_programado ? `${parseFloat(showDetail.kilometraje_programado).toLocaleString()} km` : '-'}</p>
              </div>
              <div className="form-group">
                <label>Kilometraje Realizado</label>
                <p className="text-sm">{showDetail.kilometraje_realizado ? `${parseFloat(showDetail.kilometraje_realizado).toLocaleString()} km` : '-'}</p>
              </div>
              <div className="form-group">
                <label>Costo</label>
                <p className="text-sm" style={{ fontWeight: 600, color: 'var(--success)' }}>
                  {showDetail.costo ? `Q${parseFloat(showDetail.costo).toFixed(2)}` : '-'}
                </p>
              </div>
              <div className="form-group">
                <label>Proveedor</label>
                <p className="text-sm">{showDetail.proveedor || '-'}</p>
              </div>
              {showDetail.observaciones && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Observaciones</label>
                  <p className="text-sm">{showDetail.observaciones}</p>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showComplete && (
        <div className="modal-overlay" onClick={() => setShowComplete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Completar Mantenimiento</h2>
            <p className="text-sm text-muted mb-4">
              #{showComplete.codigo} - {showComplete.tipo_mantenimiento?.nombre} - {showComplete.vehiculo?.placa}
            </p>
            <form onSubmit={handleComplete}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Kilometraje Realizado *</label>
                  <input type="number" step="0.01" value={completeForm.kilometraje_realizado}
                    onChange={e => setCompleteForm({ ...completeForm, kilometraje_realizado: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Fecha Realizada *</label>
                  <input type="date" value={completeForm.fecha_realizada}
                    onChange={e => setCompleteForm({ ...completeForm, fecha_realizada: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Costo Total *</label>
                  <input type="number" step="0.01" value={completeForm.costo}
                    onChange={e => setCompleteForm({ ...completeForm, costo: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <input value={completeForm.proveedor}
                    onChange={e => setCompleteForm({ ...completeForm, proveedor: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>No. Factura</label>
                  <input value={completeForm.factura}
                    onChange={e => setCompleteForm({ ...completeForm, factura: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Observaciones</label>
                  <textarea value={completeForm.observaciones} rows={2}
                    onChange={e => setCompleteForm({ ...completeForm, observaciones: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-4 mt-6" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowComplete(null)}>Cancelar</button>
                <button type="submit" className="btn btn-success">Completar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}</h2>
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Vehiculo *</label>
                  <select value={form.vehiculo_id} onChange={e => setForm({ ...form, vehiculo_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {vehiculos.filter(v => v.activo).map(v => (
                      <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo Mantenimiento *</label>
                  <select value={form.tipo_mantenimiento_id} onChange={e => setForm({ ...form, tipo_mantenimiento_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {tiposMantenimiento.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha Programada</label>
                  <input type="date" value={form.fecha_programada} onChange={e => setForm({ ...form, fecha_programada: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Kilometraje Programado</label>
                  <input type="number" step="0.01" value={form.kilometraje_programado} onChange={e => setForm({ ...form, kilometraje_programado: e.target.value })} placeholder="km" />
                </div>
              </div>
              <div className="form-group">
                <label>Descripcion</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} />
              </div>
              {editing && (
                <div className="grid-2">
                  <div className="form-group">
                    <label>Costo</label>
                    <input type="number" step="0.01" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Proveedor</label>
                    <input value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} />
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
