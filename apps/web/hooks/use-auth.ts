import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { AxiosError } from 'axios'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  role: 'admin' | 'user'
}

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean

  // Actions Dasar
  login: (token: string, user: User | null) => void
  logout: () => void
  fetchUser: () => Promise<void>

  // Actions OTP Login
  requestLoginOTP: (phone: string) => Promise<boolean>
  verifyLoginOTP: (phone: string, code: string) => Promise<boolean>

  // Actions OTP Register
  requestRegisterOTP: (phone: string) => Promise<boolean>
  verifyRegisterOTP: (phone: string, code: string, name: string, password: string) => Promise<boolean>
}

interface ApiErrorResponse {
  error: string
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,

      login: (token, user) => {
        // 1. Simpan ke Cookie (Synchronous) - Untuk Middleware Next.js
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`
        
        // 2. Simpan ke LocalStorage MANUAL (Synchronous) - PENTING!
        localStorage.setItem("token", token) 
        
        set({ token, user })
      },

      logout: () => {
        // 1. Hapus Cookie
        document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
        
        // 2. Hapus LocalStorage
        localStorage.removeItem("token") 
        
        // 3. Reset State Zustand
        set({ token: null, user: null })
        
        // [FIX] Gunakan replace() alih-alih href/assign.
        // Ini mengganti entry history 'Dashboard' dengan 'Login'.
        // Sehingga jika user klik tombol Back browser, mereka tidak akan kembali ke Dashboard.
        window.location.replace('/login')
      },

      fetchUser: async () => {
        try {
          const res = await api.get('/me')
          if (res.data) {
            set((state) => ({ ...state, user: res.data }))
          }
        } catch (error) {
          console.error("Gagal refresh user session", error)
        }
      },

      // =========================================
      // FITUR: OTP LOGIN
      // =========================================
      requestLoginOTP: async (phone) => {
        set({ isLoading: true })
        try {
          await api.post('/auth/login/request-otp', { phone })
          toast.success("Kode OTP telah dikirim ke WhatsApp!")
          return true
        } catch (error) {
          const err = error as AxiosError<ApiErrorResponse>
          toast.error(err.response?.data?.error || "Gagal meminta OTP")
          return false
        } finally {
          set({ isLoading: false })
        }
      },

      verifyLoginOTP: async (phone, code) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/login/verify-otp', { phone, code })
          
          const token = res.data.token
          
          // Panggil fungsi login
          get().login(token, null) 

          // Beri jeda agar token terbaca
          await new Promise(resolve => setTimeout(resolve, 100));

          await get().fetchUser()

          toast.success("Login Berhasil!")
          return true
        } catch (error) {
          const err = error as AxiosError<ApiErrorResponse>
          toast.error(err.response?.data?.error || "Kode OTP Salah")
          return false
        } finally {
          set({ isLoading: false })
        }
      },

      // =========================================
      // FITUR: OTP REGISTER
      // =========================================
      requestRegisterOTP: async (phone) => {
        set({ isLoading: true })
        try {
          await api.post('/auth/register/request-otp', { phone })
          toast.success("Kode OTP dikirim! Silakan cek WhatsApp.")
          return true
        } catch (error) {
          const err = error as AxiosError<ApiErrorResponse>
          toast.error(err.response?.data?.error || "Gagal request OTP")
          return false
        } finally {
          set({ isLoading: false })
        }
      },

      verifyRegisterOTP: async (phone, code, name, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/register/verify-otp', { phone, code, name, password })
          
          const token = res.data.token
          
          get().login(token, null)
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await get().fetchUser()
          
          toast.success("Registrasi Berhasil!")
          return true
        } catch (error) {
          const err = error as AxiosError<ApiErrorResponse>
          toast.error(err.response?.data?.error || "Verifikasi Gagal")
          return false
        } finally {
          set({ isLoading: false })
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)