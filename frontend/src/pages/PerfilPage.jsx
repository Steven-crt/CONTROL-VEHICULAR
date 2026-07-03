import { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, Shield, Key, Save, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../services/api'

export default function PerfilPage() {
  const { usuario, setUsuario } = useAuthStore()
  const [editMode, setEditMode] = useState(false)
  const [changePassword, setChangePassword] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (usuario) {
      setForm({
        nombre: usuario.nombre || '',
        apellido: usuario.apellido || '',
        email: usuario.email || '',
        telefono: usuario.telefono || ''
      })
    }
  }, [usuario])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim()) {
      toast.error('Nombre, apellido y email son obligatorios')
      return
    }

    try {
      const { data } = await api.put(`/usuarios/${usuario.id}`, form)
      setUsuario({ ...usuario, ...form })
      toast.success('Perfil actualizado correctamente')
      setEditMode(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al actualizar perfil')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Todos los campos son obligatorios')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      await api.put('/usuarios/cambiar-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      toast.success('Contraseña actualizada correctamente')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setChangePassword(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cambiar contraseña')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{ animation: 'slideUp 380ms ease both' }}>
      <div className="page-header">
        <h1>Mi Perfil</h1>
      </div>

      <div className="grid-2" style={{ maxWidth: 1200 }}>
        {/* Card Principal */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 className="card-title">Información Personal</h2>
            {!editMode && (
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => setEditMode(true)}
              >
                <Edit2 size={14} /> Editar
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="grid-2">
              <div className="form-group">
                <label htmlFor="nombre">
                  <User size={14} /> Nombre
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  disabled={!editMode}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido">
                  <User size={14} /> Apellido
                </label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  disabled={!editMode}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <Mail size={14} /> Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={!editMode}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">
                  <Phone size={14} /> Teléfono
                </label>
                <input
                  type="text"
                  id="telefono"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  disabled={!editMode}
                  placeholder="Opcional"
                />
              </div>
            </div>

            {editMode && (
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={14} /> Guardar Cambios
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditMode(false)
                    setForm({
                      nombre: usuario.nombre || '',
                      apellido: usuario.apellido || '',
                      email: usuario.email || '',
                      telefono: usuario.telefono || ''
                    })
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Card Información del Sistema */}
        <div className="card">
          <h2 className="card-title">Información de Cuenta</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                <Shield size={16} />
                <span style={{ fontSize: 13 }}>Rol</span>
              </div>
              <span className={`badge ${usuario?.rol === 'Administrador' ? 'badge-success' : 'badge-info'}`}>
                {usuario?.rol || 'Usuario'}
              </span>
            </div>

            <div className="info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                <Calendar size={16} />
                <span style={{ fontSize: 13 }}>Último Acceso</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {formatDate(usuario?.ultimo_acceso)}
              </span>
            </div>

            <div className="info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                <Calendar size={16} />
                <span style={{ fontSize: 13 }}>Cuenta Creada</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {formatDate(usuario?.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Cambio de Contraseña */}
      <div className="card" style={{ maxWidth: 600, marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 className="card-title">Seguridad</h2>
          {!changePassword && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => setChangePassword(true)}
            >
              <Key size={14} /> Cambiar Contraseña
            </button>
          )}
        </div>

        {changePassword ? (
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label htmlFor="currentPassword">Contraseña Actual</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Nueva Contraseña</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
                autoComplete="new-password"
                minLength={6}
              />
              <small className="text-muted">Mínimo 6 caracteres</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                required
                autoComplete="new-password"
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn btn-primary">
                <Save size={14} /> Actualizar Contraseña
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setChangePassword(false)
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <p className="text-muted" style={{ fontSize: 13 }}>
            Tu contraseña está protegida. Haz clic en "Cambiar Contraseña" para actualizarla.
          </p>
        )}
      </div>

      <style>{`
        .perfil-info .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
        .perfil-info .info-row:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  )
}
