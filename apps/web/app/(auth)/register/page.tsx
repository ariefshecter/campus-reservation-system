"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { AxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Import ikon Eye dan EyeOff
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import api from "@/lib/axios"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // State untuk toggle password visibility
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post("/auth/register", formData)
      toast.success("Akun berhasil dibuat!")
      router.push("/login?registered=true")
    } catch (error) {
      console.error(error)
      if (error instanceof AxiosError && error.response) {
        const msg = error.response.data.error || "Gagal mendaftar."
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
      {/* HEADER LOGO */}
      <div className="flex flex-col items-center text-center">
        
        {/* CONTAINER LOGO */}
        <div className="relative mb-6 h-32 w-32 shrink-0">
          <Image 
            src="/logo.png" 
            alt="UniSpace Logo" 
            fill
            className="object-contain"
            priority
          />
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-white">
          Buat Akun Baru
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Bergabunglah untuk mulai meminjam fasilitas kampus
        </p>
      </div>

      {/* CARD FORM */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
        <form onSubmit={handleRegister} className="space-y-5">
          
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-200">Username</Label>
            <Input 
              id="name" 
              name="name" 
              type="text" 
              placeholder="Contoh: Budi Santoso" 
              required 
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

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
            <div className="relative">
              <Input 
                id="password" 
                name="password" 
                // Toggle tipe input
                type={showPassword ? "text" : "password"} 
                placeholder="Minimal 6 karakter"
                required 
                // Tambahkan padding kanan agar teks tidak tertutup ikon
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 pr-10"
                value={formData.password}
                onChange={handleChange}
              />
              
              {/* Tombol Toggle Icon */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            
            <p className="text-xs text-slate-500">
              Gunakan password yang kuat agar akun Anda aman.
            </p>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-6 mt-2" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Daftar Sekarang"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  )
}