import { useState, useEffect } from 'react'
import { Settings, Users, Plus, Edit, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../services/api'

export default function ConfiguracionPage() {
  const [tab, setTab] = useState('general')
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'

  return (
    <div>
      <div className="page-header">
        <h1>Configuracion</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>
          <Settings size={16} style={{ marginRight: 6 }} /> General
        </button>
        {isAdmin && (
          <button className={`tab ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}>
            <Users size={16} style={{ marginRight: 6 }} /> Usuarios
          </button>
        )}
      </div>

      {tab === 'general' && <GeneralTab />}
      {tab === 'usuarios' && isAdmin && <UsuariosTab />}
    </div>
  )
}

function GeneralTab() {
  return (
    <div className="card">
      <h2 className="mb-6">Informacion del Sistema</h2>
      <div className="grid-2">
        <div className="form-group">
          <label>Nombre del Sistema</label>
          <p style={{ fontWeight: 600 }}>Control Vehicular</p>
        </div>
        <div className="form-group">
          <label>Version</label>
          <p>1.0.0</p>
        </div>
        <div className="form-group">
          <label>Moneda</label>
          <p>S/ (Soles)</p>
        </div>
        <div className="form-group">
          <label>Base de Datos</label>
          <p>MySQL</p>
        </div>
      </div>
    </div>
  )
}

function UsuariosTab() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '', telefono: '', rol_id: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usuRes, rolRes] = await Promise.all([
          api.get('/usuarios'),
          api.get('/roles')
        ])
        setUsuarios(usuRes.data)
        setRoles(rolRes.data)
      } catch (error) {
        toast.error('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ nombre: '', apellido: '', email: '', password: '', telefono: '', rol_id: '' })
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({
      nombre: u.nombre, apellido: u.apellido, email: u.email,
      password: '', telefono: u.telefono || '', rol_id: u.rol_id
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        const { data } = await api.put(`/usuarios/${editing.id}`, payload)
        setUsuarios(prev => prev.map(u => u.id === editing.id ? data : u))
        toast.success('Usuario actualizado')
      } else {
        const { data } = await api.post('/usuarios', form)
        setUsuarios(prev => [data, ...prev])
        toast.success('Usuario creado')
      }
      setShowModal(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar usuario')
    }
  }

  const handleToggleActivo = async (u) => {
    const accion = u.activo ? 'suspender' : 'activar'
    if (!window.confirm(`Esta seguro de ${accion} a ${u.nombre} ${u.apellido}?`)) return
    try {
      await api.delete(`/usuarios/${u.id}`)
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: !x.activo } : x))
      toast.success(`Usuario ${u.activo ? 'suspendido' : 'activado'} exitosamente`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cambiar estado')
    }
  }

  if (loading) {
    return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando usuarios...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h2>Usuarios del Sistema</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Telefono</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 40 }}>No hay usuarios registrados</td></tr>
              ) : usuarios.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.nombre} {u.apellido}</strong></td>
                  <td>{u.email}</td>
                  <td><span className="badge badge-info">{u.rol?.nombre}</span></td>
                  <td>{u.telefono || '-'}</td>
                  <td><span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)} title="Editar usuario">
                        <Edit size={14} />
                      </button>
                      <button className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleToggleActivo(u)}
                        title={u.activo ? 'Suspender usuario' : 'Activar usuario'}>
                        {u.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Telefono</label>
                  <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Contrasena {editing ? '(dejar vacio para mantener)' : '*'}</label>
                  <input type="password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required={!editing} />
                </div>
                <div className="form-group">
                  <label>Rol *</label>
                  <select value={form.rol_id} onChange={e => setForm({ ...form, rol_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
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
