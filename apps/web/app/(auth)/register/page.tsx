"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
      
      // UBAH DISINI: Redirect dengan sinyal "?registered=true"
      router.push("/login?registered=true")

    } catch (error) {
      console.error(error)
      if (error instanceof AxiosError && error.response) {
        const data = error.response.data as ApiErrorResponse;
        const msg = data.error || "Gagal mendaftar.";
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
          Daftar Akun
        </CardTitle>
        <CardDescription>
          Buat akun baru untuk mulai meminjam fasilitas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="Contoh: Budi Santoso" 
              required 
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="budi@unu.ac.id" 
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
              placeholder="Minimal 6 karakter"
              required 
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Mendaftar..." : "Daftar Sekarang"}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Login disini
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}