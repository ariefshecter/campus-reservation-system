"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Loader2 } from "lucide-react"
import api from "@/lib/axios"

interface ApiErrorResponse {
  error: string;
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("") 
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Registrasi berhasil! Silakan login.")
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
    <div className="w-full max-w-md space-y-8">
      {/* HEADER */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-900/40 mb-4">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Selamat Datang
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Masuk untuk mengelola reservasi ruangan kampus
        </p>
      </div>

      {/* CARD FORM - Glass Effect */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
        
        {successMessage && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm text-center font-medium">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">Email Kampus</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="nama@unu.ac.id" 
              required 
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••"
              required 
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-6" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Masuk ke UniSpace"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">Belum punya akun? </span>
          <Link href="/register" className="font-medium text-blue-400 hover:text-blue-300 hover:underline transition">
            Daftar sekarang
          </Link>
        </div>
      </div>
      
      <div className="text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} UniSpace Campus Reservation
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-white">Memuat...</div>}>
      <LoginContent />
    </Suspense>
  )
}