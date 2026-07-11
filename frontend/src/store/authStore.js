import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import api from '../services/api'
import { startInactivityMonitor } from '../services/security'

const SESSION_TIMEOUT = 30 * 60 * 1000

// Validar que el estado persistido sea válido y limpiar si está corrupto
function validarEstadoPersistido(state) {
  if (!state || typeof state !== 'object') {
    limpiarAuthStorage()
    return { usuario: null, token: null, refreshToken: null, lastActivity: null }
  }

  // Validar token (debe ser string o null/undefined)
  if (state.token !== undefined && state.token !== null && typeof state.token !== 'string') {
    console.warn('Token corrupto detectado, limpiando almacenamiento...')
    limpiarAuthStorage()
    return { usuario: null, token: null, refreshToken: null, lastActivity: null }
  }

  // Si usuario existe pero no tiene los campos esperados, es corrupto
  if (state.usuario && typeof state.usuario === 'object') {
    const camposRequeridos = ['id', 'nombre', 'email', 'rol']
    const valido = camposRequeridos.some(campo => state.usuario[campo] !== undefined)
    if (!valido) {
      console.warn('Estado de auth corrupto detectado, limpiando almacenamiento...')
      limpiarAuthStorage()
      return { usuario: null, token: null, refreshToken: null, lastActivity: null }
    }
  }

  return state
}

function limpiarAuthStorage() {
  try {
    localStorage.removeItem('auth-storage')
    sessionStorage.removeItem('auth-storage')
  } catch {}
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      usuario: null,
      token: null,
      refreshToken: null,
      loading: false,
      lastActivity: null,
      _cleanupInactivity: null,

      login: async (email, password) => {
        set({ loading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          set({
            usuario: data.usuario,
            token: data.token,
            refreshToken: data.refreshToken,
            lastActivity: Date.now(),
            loading: false
          })
          return data
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return false

        try {
          const { data } = await api.post('/auth/refresh', { refreshToken })
          set({ token: data.token, refreshToken: data.refreshToken, lastActivity: Date.now() })
          return true
        } catch {
          set({ usuario: null, token: null, refreshToken: null, lastActivity: null })
          return false
        }
      },

      logout: async () => {
        // Siempre limpiar el estado local, independientemente de si el servidor responde
        const cleanup = get()._cleanupInactivity
        if (cleanup) cleanup()

        // Intentar notificar al servidor, pero no bloquear el logout si falla
        try {
          await api.post('/auth/logout')
        } catch {
          // Ignorar errores del servidor (incluyendo 401) — el estado local se limpia igual
        }

        limpiarAuthStorage()
        set({ usuario: null, token: null, refreshToken: null, lastActivity: null, _cleanupInactivity: null })
      },

      checkAuth: async () => {
        const { token, lastActivity } = get()
        if (!token) return false

        if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT) {
          get().logout()
          return false
        }

        try {
          const { data } = await api.get('/auth/me')
          set({ usuario: data.usuario, lastActivity: Date.now() })
          return true
        } catch {
          set({ usuario: null, token: null, refreshToken: null, lastActivity: null })
          return false
        }
      },

      initInactivityMonitor: () => {
        set({ lastActivity: Date.now() })
        const cleanup = startInactivityMonitor(
          () => {
            get().logout()
            window.location.href = '/login'
          }
        )
        set({ _cleanupInactivity: cleanup })
      }
    }),
    {
      name: 'auth-storage',
      // Usar localStorage para persistir la sesión entre recargas de página
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        usuario: state.usuario,
        token: state.token,
        refreshToken: state.refreshToken,
        lastActivity: state.lastActivity
      }),
      merge: (persisted, current) => ({
        ...current,
        ...validarEstadoPersistido(persisted)
      })
    }
  )
)

export default useAuthStore
