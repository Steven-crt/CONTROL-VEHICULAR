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
  timeout: 10000
})

let isRefreshing = false
let failedQueue = []

const STORAGE_KEYS = {
  auth: 'auth-storage',
  legacy: 'auth-storage-legacy'
}

const readAuthState = () => {
  const stored = sessionStorage.getItem(STORAGE_KEYS.auth) || localStorage.getItem(STORAGE_KEYS.auth)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored)
    if (localStorage.getItem(STORAGE_KEYS.auth)) {
      localStorage.removeItem(STORAGE_KEYS.auth)
      sessionStorage.setItem(STORAGE_KEYS.auth, stored)
    }
    return parsed.state || null
  } catch {
    Object.values(STORAGE_KEYS).forEach(k => {
      sessionStorage.removeItem(k)
      localStorage.removeItem(k)
    })
    return null
  }
}

const writeAuthState = (state) => {
  sessionStorage.setItem(STORAGE_KEYS.auth, JSON.stringify({ state }))
  Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.auth).forEach(k => {
    localStorage.removeItem(k)
  })
}

const clearAuthState = () => {
  Object.values(STORAGE_KEYS).forEach(k => {
    sessionStorage.removeItem(k)
    localStorage.removeItem(k)
  })
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

api.interceptors.request.use(config => {
  const state = readAuthState()
  if (state?.token) {
    config.headers.Authorization = `Bearer ${state.token}`
  }

  if (config.data && !(config.data instanceof FormData)) {
    config.data = limpiarDatosFormulario(config.data)
  }

  return config
})

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

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

api.interceptors.response.use(
  response => response,
  async error => {
    normalizeError(error)
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const state = readAuthState()
      if (!state) {
        clearAuthState()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (!state?.refreshToken) {
        clearAuthState()
        window.location.href = '/login'
        return Promise.reject(error)
      }

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

        const newState = {
          ...state,
          token: data.token,
          refreshToken: data.refreshToken
        }
        writeAuthState(newState)

        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        processQueue(null, data.token)

        originalRequest.headers.Authorization = `Bearer ${data.token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuthState()
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
