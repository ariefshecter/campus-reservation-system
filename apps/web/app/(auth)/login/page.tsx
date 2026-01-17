"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import api from "@/lib/axios"

interface ApiErrorResponse {
  error: string;
}

// ==========================================
// BAGIAN 1: LOGIKA FORM (LOGIN CONTENT)
// ==========================================
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  // State baru untuk menyimpan pesan sukses yang menetap
  const [successMessage, setSuccessMessage] = useState("") 
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  // Efek: Cek URL apakah ada sinyal 'registered=true'
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      // Set pesan ke state agar muncul sebagai teks statis
      setSuccessMessage("Registrasi berhasil! Silakan login dengan akun baru Anda.")
      
      // Bersihkan URL agar bersih, tapi pesan tetap ada di state
      router.replace("/login")
    }
  }, [searchParams, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await api.post("/auth/login", formData)
      const token = res.data.token

      localStorage.setItem("token", token)

      const meRes = await api.get("/me")
      const role = meRes.data.role

      toast.success("Login berhasil! Mengalihkan...")

      if (role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/user/dashboard")
      }

    } catch (error) {
      console.error(error)
      if (error instanceof AxiosError && error.response) {
        const data = error.response.data as ApiErrorResponse;
        const msg = data.error || "Gagal login, periksa email/password.";
        toast.error(msg)
      } else {
        toast.error("Gagal terhubung ke server.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-slate-800">
          Login Kampus
        </CardTitle>
        <CardDescription>
          Masuk untuk melakukan reservasi ruangan
        </CardDescription>
      </CardHeader>
      <CardContent>
        
        {/* FITUR BARU: Menampilkan Alert Hijau jika ada successMessage */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm text-center">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="nama@unu.ac.id" 
              required 
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••"
              required 
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{" "}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Daftar disini
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// BAGIAN 2: HALAMAN UTAMA (PAGE)
// ==========================================
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center">Memuat form login...</div>}>
      <LoginContent />
    </Suspense>
  )
}