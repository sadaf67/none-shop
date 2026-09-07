import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  username: string
  email: string
  full_name: string
  avatar?: string
  phone?: string
  is_staff?: boolean
  is_superuser?: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, tokens: { access: string; refresh: string }) => void
  setTokens: (access: string, refresh: string) => void
  updateUser: (user: Partial<User>) => void
  logout: (notifyServer?: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, tokens) => {
        localStorage.setItem('access_token', tokens.access)
        localStorage.setItem('refresh_token', tokens.refresh)
        set({ user, accessToken: tokens.access, refreshToken: tokens.refresh, isAuthenticated: true })
      },
      setTokens: (access, refresh) => {
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true })
      },
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
      logout: (notifyServer = true) => {
        const access = localStorage.getItem('access_token')
        const refresh = localStorage.getItem('refresh_token')
        if (notifyServer && access && refresh) {
          const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
          void fetch(`${baseUrl}/auth/logout/`, {
            method: 'POST',
            keepalive: true,
            headers: {
              Authorization: `Bearer ${access}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh }),
          }).catch(() => undefined)
        }
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    { name: 'auth-storage' }
  )
)
