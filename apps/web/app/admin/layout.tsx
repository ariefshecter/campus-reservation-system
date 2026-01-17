"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import api from "@/lib/axios"
import { toast } from "sonner"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Efek: Cek apakah user adalah ADMIN saat halaman dibuka
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token")
        
        if (!token) {
          throw new Error("No token")
        }

        // Panggil endpoint /me untuk cek role terbaru
        const res = await api.get("/me")
        
        if (res.data.role !== "admin") {
          toast.error("Akses Ditolak. Halaman ini khusus Admin.")
          router.replace("/user/dashboard") // Lempar user biasa ke dashboard mereka
          return
        }

        // Jika lolos, izinkan render
        setIsAuthorized(true)
      } catch (error) {
        console.error("Gagal verifikasi admin:", error)
        
        // Jika token tidak valid atau expired
        localStorage.removeItem("token")
        router.replace("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Tampilkan loading saat sedang mengecek
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500 animate-pulse">Memverifikasi akses admin...</p>
      </div>
    )
  }

  // Jika tidak authorized, jangan tampilkan apa-apa (karena sedang redirect)
  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar Tetap di Kiri (Fixed Position) */}
      <AdminSidebar />
      
      {/* PERBAIKAN DISINI: 
         1. Hapus 'flex-1' dan 'overflow-y-auto' (karena scroll sekarang di body browser)
         2. Tambahkan 'ml-64' agar konten bergeser ke kanan sejauh lebar sidebar
      */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  )
}