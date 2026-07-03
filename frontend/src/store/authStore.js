import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import api from '../services/api'
import { startInactivityMonitor } from '../services/security'

const SESSION_TIMEOUT = 30 * 60 * 1000

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
        try {
          await api.post('/auth/logout')
        } catch (e) { }
        const cleanup = get()._cleanupInactivity
        if (cleanup) cleanup()
        sessionStorage.removeItem('auth-storage')
        localStorage.removeItem('auth-storage')
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
          },
          () => {}
        )
        set({ _cleanupInactivity: cleanup })
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: state => ({
        usuario: state.usuario,
        token: state.token,
        refreshToken: state.refreshToken,
        lastActivity: state.lastActivity
      })
    }
  )
)

export default useAuthStore
