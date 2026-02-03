"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { AxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth" // Import hook OTP yang baru
import { Loader2, Eye, EyeOff, Mail, Smartphone } from "lucide-react" // Tambah ikon Smartphone & Mail
import api from "@/lib/axios"

interface ApiErrorResponse {
  error: string;
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // --- STATE UMUM ---
  const [loginMethod, setLoginMethod] = useState<"EMAIL" | "WHATSAPP">("EMAIL")
  
  // --- STATE LOGIN EMAIL (EXISTING) ---
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [successMessage, setSuccessMessage] = useState("") 
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  // --- STATE LOGIN WHATSAPP (BARU) ---
  const { requestLoginOTP, verifyLoginOTP, isLoading: loadingOTP } = useAuth()
  const [otpStep, setOtpStep] = useState<"PHONE" | "OTP">("PHONE")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Registrasi berhasil! Silakan login.")
      router.replace("/login")
    }
  }, [searchParams, router])

  // --- HANDLER EMAIL ---
  const handleChangeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLoginEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEmail(true)

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
      setLoadingEmail(false)
    }
  }

  // --- HANDLER WHATSAPP ---
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    // Panggil fungsi dari useAuth
    const success = await requestLoginOTP(phone)
    if (success) setOtpStep("OTP")
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    // Panggil fungsi dari useAuth
    const success = await verifyLoginOTP(phone, otp)
    if (success) {
      // Redirect sudah dihandle di dalam verifyLoginOTP (atau bisa manual disini)
      router.push("/user/dashboard") 
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* HEADER LOGO */}
      <div className="flex flex-col items-center text-center">
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
          Selamat Datang
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Masuk untuk mengelola reservasi ruangan kampus
        </p>
      </div>

      {/* CARD FORM */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
        
        {/* TABS SWITCHER */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-black/20 rounded-lg">
          <button
            onClick={() => setLoginMethod("EMAIL")}
            className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              loginMethod === "EMAIL" 
                ? "bg-blue-600 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => setLoginMethod("WHATSAPP")}
            className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              loginMethod === "WHATSAPP" 
                ? "bg-green-600 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            WhatsApp
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm text-center font-medium">
            {successMessage}
          </div>
        )}

        {/* --- FORM EMAIL --- */}
        {loginMethod === "EMAIL" && (
          <form onSubmit={handleLoginEmail} className="space-y-6">
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
                onChange={handleChangeEmail}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  required 
                  className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 pr-10"
                  value={formData.password}
                  onChange={handleChangeEmail}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-6" disabled={loadingEmail}>
              {loadingEmail ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Masuk dengan Email"}
            </Button>
          </form>
        )}

        {/* --- FORM WHATSAPP OTP --- */}
        {loginMethod === "WHATSAPP" && (
          <div className="space-y-6">
            {otpStep === "PHONE" ? (
              <form onSubmit={handleRequestOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-200">Nomor WhatsApp</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="Contoh: 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required 
                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500"
                  />
                  <p className="text-xs text-slate-400">Pastikan nomor aktif dan terhubung ke WhatsApp.</p>
                </div>

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-6" disabled={loadingOTP}>
                  {loadingOTP ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Kirim Kode OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-slate-200">Kode OTP</Label>
                  <Input 
                    id="otp" 
                    type="text" 
                    placeholder="XXXXXX"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required 
                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500 text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-center text-slate-400">Kode dikirim ke {phone}</p>
                </div>

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-6" disabled={loadingOTP}>
                  {loadingOTP ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verifikasi & Masuk"}
                </Button>
                
                <Button 
                  variant="ghost" 
                  type="button" 
                  className="w-full text-slate-400 hover:text-white"
                  onClick={() => setOtpStep("PHONE")}
                  disabled={loadingOTP}
                >
                  Ganti Nomor HP
                </Button>
              </form>
            )}
          </div>
        )}

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