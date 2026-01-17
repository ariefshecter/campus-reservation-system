import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '@/lib/axios' // Pastikan axios diimport

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

interface AuthState {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  fetchUser: () => Promise<void> // Fungsi Baru
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: (token, user) => {
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`
        set({ token, user })
      },

      logout: () => {
        document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
        set({ token: null, user: null })
      },

      // Fungsi untuk refresh data user dari backend
      fetchUser: async () => {
        try {
          const res = await api.get('/me')
          if (res.data) {
            set((state) => ({ ...state, user: res.data }))
          }
        } catch (error) {
          console.error("Gagal refresh user session", error)
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)