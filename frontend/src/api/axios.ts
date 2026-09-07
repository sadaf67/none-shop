import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface RefreshResponse {
  access: string
  refresh?: string
}

let refreshPromise: Promise<RefreshResponse> | null = null

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetryableRequest | undefined
    const isRefreshRequest = String(original?.url || '').includes('/auth/token/refresh/')

    if (error.response?.status !== 401 || !original || original._retry || isRefreshRequest) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      useAuthStore.getState().logout(false)
      return Promise.reject(error)
    }

    original._retry = true
    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post<RefreshResponse>(`${API_BASE_URL}/auth/token/refresh/`, { refresh: refreshToken }, { timeout: 20_000 })
          .then(({ data }) => data)
      }

      const tokens = await refreshPromise
      const rotatedRefresh = tokens.refresh || refreshToken
      useAuthStore.getState().setTokens(tokens.access, rotatedRefresh)
      original.headers.Authorization = `Bearer ${tokens.access}`
      return api(original)
    } catch (refreshError) {
      useAuthStore.getState().logout(false)
      if (window.location.pathname !== '/login') {
        const next = `${window.location.pathname}${window.location.search}`
        window.location.assign(`/login?next=${encodeURIComponent(next)}`)
      }
      return Promise.reject(refreshError)
    } finally {
      refreshPromise = null
    }
  },
)

export default api
