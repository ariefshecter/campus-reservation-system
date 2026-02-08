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
import { useAuth } from "@/hooks/use-auth" // Import Hook Auth
import { Loader2, ArrowLeft, Eye, EyeOff, Mail, Smartphone } from "lucide-react"
import api from "@/lib/axios"

interface ApiErrorResponse {
  error: string;
}

export default function RegisterPage() {
  const router = useRouter()
  
  // --- STATE UMUM ---
  const [registerMethod, setRegisterMethod] = useState<"EMAIL" | "WHATSAPP">("WHATSAPP")

  // --- STATE REGISTER EMAIL ---
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  // --- STATE REGISTER WHATSAPP ---
  const { requestRegisterOTP, verifyRegisterOTP, isLoading: loadingOTP } = useAuth()
  const [otpStep, setOtpStep] = useState<"FORM" | "OTP">("FORM")
  const [showWaPassword, setShowWaPassword] = useState(false) // State visibility password WA
  const [waData, setWaData] = useState({
    name: "",
    phone: "",
    otp: "",
    password: "" // Field Password untuk WA
  })

  // --- HANDLER EMAIL ---
  const handleChangeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegisterEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEmail(true)

    try {
      await api.post("/auth/register", formData)
      toast.success("Akun berhasil dibuat!")
      router.push("/login?registered=true")
    } catch (error) {
      console.error(error)
      if (error instanceof AxiosError && error.response) {
        const data = error.response.data as ApiErrorResponse
        const msg = data.error || "Gagal mendaftar."
        toast.error(msg)
      } else {
        toast.error("Gagal terhubung ke server.")
      }
    } finally {
      setLoadingEmail(false)
    }
  }

  // --- HANDLER WHATSAPP (DIMODIFIKASI) ---
  const handleChangeWa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // [MODIFIKASI] Validasi Khusus: Phone hanya boleh ANGKA
    if (name === "phone") {
        // Regex: Ganti semua karakter yang BUKAN angka (\D) dengan string kosong
        const numericValue = value.replace(/\D/g, "")
        setWaData({ ...waData, [name]: numericValue })
        return
    }

    // Default behavior untuk input lain (name, otp, password)
    setWaData({ ...waData, [name]: value })
  }

  // Langkah 1: Kirim OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    // [MODIFIKASI] Validasi Panjang Nomor Sederhana
    if (waData.phone.length < 10) {
        toast.error("Nomor WhatsApp tidak valid (terlalu pendek)")
        return
    }

    const success = await requestRegisterOTP(waData.phone)
    if (success) setOtpStep("OTP")
  }

  // Langkah 2: Verifikasi OTP + Password
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    // [UPDATE] Mengirim password juga
    const success = await verifyRegisterOTP(waData.phone, waData.otp, waData.name, waData.password)
    if (success) {
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
          Buat Akun Baru
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Bergabunglah untuk mulai meminjam fasilitas kampus
        </p>
      </div>

      {/* CARD FORM */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
        
        {/* TABS SWITCHER */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-black/20 rounded-lg">
           <button
            onClick={() => setRegisterMethod("WHATSAPP")}
            className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              registerMethod === "WHATSAPP" 
                ? "bg-green-600 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={() => setRegisterMethod("EMAIL")}
            className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              registerMethod === "EMAIL" 
                ? "bg-blue-600 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>

        {/* --- FORM WHATSAPP (UTAMA) --- */}
        {registerMethod === "WHATSAPP" && (
           <div className="space-y-5">
             {otpStep === "FORM" ? (
               <form onSubmit={handleRequestOTP} className="space-y-5">
                 <div className="space-y-2">
                    <Label htmlFor="waName" className="text-slate-200">Nama Lengkap</Label>
                    <Input 
                      id="waName" 
                      name="name" 
                      placeholder="Contoh: Budi Santoso" 
                      required 
                      className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500"
                      value={waData.name}
                      onChange={handleChangeWa}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="waPhone" className="text-slate-200">Nomor WhatsApp</Label>
                    <Input 
                      id="waPhone" 
                      name="phone" 
                      type="tel"
                      placeholder="Contoh: 081234567890" 
                      required 
                      className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500"
                      value={waData.phone}
                      onChange={handleChangeWa}
                    />
                    <p className="text-xs text-slate-500">Kode OTP akan dikirim ke nomor ini.</p>
                 </div>

                 <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-6" disabled={loadingOTP}>
                    {loadingOTP ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Kirim OTP WhatsApp"}
                 </Button>
               </form>
             ) : (
               <form onSubmit={handleVerifyOTP} className="space-y-5">
                 <div className="space-y-2">
                    <Label htmlFor="otp" className="text-slate-200">Kode OTP</Label>
                    <Input 
                      id="otp" 
                      name="otp" 
                      type="text"
                      placeholder="XXXXXX" 
                      required 
                      maxLength={6}
                      className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500 text-center text-2xl tracking-widest"
                      value={waData.otp}
                      onChange={handleChangeWa}
                    />
                    <p className="text-xs text-center text-slate-500">Dikirim ke {waData.phone}</p>
                 </div>

                 {/* [BARU] INPUT PASSWORD UNTUK USER WHATSAPP */}
                 <div className="space-y-2">
                    <Label htmlFor="waPassword" className="text-slate-200">Buat Password</Label>
                    <div className="relative">
                      <Input 
                        id="waPassword" 
                        name="password" 
                        type={showWaPassword ? "text" : "password"} 
                        placeholder="Minimal 6 karakter"
                        required 
                        className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-green-500 pr-10"
                        value={waData.password}
                        onChange={handleChangeWa}
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaPassword(!showWaPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showWaPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Password ini bisa digunakan untuk login email nanti.</p>
                 </div>

                 <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-6" disabled={loadingOTP}>
                    {loadingOTP ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verifikasi & Daftar"}
                 </Button>
                 
                 <Button 
                    variant="ghost" 
                    type="button" 
                    className="w-full text-slate-400 hover:text-white"
                    onClick={() => setOtpStep("FORM")}
                    disabled={loadingOTP}
                  >
                    Ganti Nomor / Nama
                  </Button>
               </form>
             )}
           </div>
        )}

        {/* --- FORM EMAIL (LAMA) --- */}
        {registerMethod === "EMAIL" && (
          <form onSubmit={handleRegisterEmail} className="space-y-5">
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
                onChange={handleChangeEmail}
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
                  placeholder="Minimal 6 karakter"
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
              <p className="text-xs text-slate-500">
                Gunakan password yang kuat agar akun Anda aman.
              </p>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-6 mt-2" disabled={loadingEmail}>
              {loadingEmail ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Daftar dengan Email"}
            </Button>
          </form>
        )}

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