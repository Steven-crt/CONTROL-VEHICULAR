import axios from 'axios'
import { limpiarDatosFormulario } from './security'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  },
  timeout: 15000
})

let isRefreshing = false
let failedQueue = []

// Lee el estado de auth directamente desde localStorage (donde Zustand lo persiste)
// Esto evita dependencia circular con el store y funciona antes de que React monte
const getAuthState = () => {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state || null
  } catch {
    return null
  }
}

// Actualiza solo el token en el storage persistido, sin importar el store
const updateTokenInStorage = (newToken, newRefreshToken) => {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (!stored) return
    const parsed = JSON.parse(stored)
    if (parsed?.state) {
      parsed.state.token = newToken
      if (newRefreshToken) parsed.state.refreshToken = newRefreshToken
      localStorage.setItem('auth-storage', JSON.stringify(parsed))
    }
  } catch {}
}

const clearStorage = () => {
  try {
    localStorage.removeItem('auth-storage')
    sessionStorage.removeItem('auth-storage')
  } catch {}
}

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

function normalizeError(error) {
  const data = error?.response?.data
  if (data && typeof data === 'object') {
    if (typeof data.error === 'object' && data.error !== null) {
      data.error = JSON.stringify(data.error)
    } else if (data.error === undefined && typeof data.message === 'string') {
      data.error = data.message
    }
  }
  return error
}

// Interceptor de REQUEST: añade el token Bearer al header Authorization
api.interceptors.request.use(config => {
  const state = getAuthState()
  if (state?.token) {
    config.headers.Authorization = `Bearer ${state.token}`
  }

  if (config.data && !(config.data instanceof FormData)) {
    config.data = limpiarDatosFormulario(config.data)
  }

  return config
})

// Interceptor de RESPONSE: maneja 401 intentando refresh de token automático
api.interceptors.response.use(
  response => response,
  async error => {
    normalizeError(error)
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const state = getAuthState()

      // Sin sesión local → ir a login directamente
      if (!state?.token) {
        clearStorage()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // Sin refreshToken → no se puede renovar, ir a login
      if (!state?.refreshToken) {
        clearStorage()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // Si ya estamos haciendo refresh, encolar esta petición
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: state.refreshToken
        })

        // Actualizar token en storage para que el store de Zustand lo use
        updateTokenInStorage(data.token, data.refreshToken)

        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        processQueue(null, data.token)

        originalRequest.headers.Authorization = `Bearer ${data.token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearStorage()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
