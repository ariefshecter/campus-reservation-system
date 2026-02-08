"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { 
  User, 
  MapPin, 
  Phone, 
  Briefcase, 
  Loader2, 
  Camera, 
  Save, 
  Lock, 
  Fingerprint,
  Users, 
  Building2, 
  UserCog,
  Eye,      
  EyeOff,
  Mail,
  Smartphone
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/* =======================
   TYPES
======================= */
type ProfileData = {
  full_name: string;
  phone_number: string;
  address: string;
  avatar_url: string;
  department: string;
  position: string;
  identity_number: string;
  gender: string; 
  user_id?: string;
};

// URL Backend untuk akses gambar
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export default function UserProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // State Data Profil
  const [formData, setFormData] = useState<ProfileData>({
    full_name: "",
    phone_number: "",
    address: "",
    avatar_url: "",
    department: "",
    position: "",
    identity_number: "",
    gender: "", 
  });

  // State Email
  const [currentEmail, setCurrentEmail] = useState("");
  const [emailForm, setEmailForm] = useState({
    new_email: "",
    password: "", 
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);

  // State Ganti Password
  const [passData, setPassData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // ==========================================
  // STATE GANTI NOMOR HP (OTP)
  // ==========================================
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"INPUT" | "VERIFY">("INPUT");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* =======================
     1. FETCH DATA
  ======================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resProfile = await api.get("/profile");
        if (resProfile.data) {
          setFormData((prev) => ({ 
            ...prev, 
            ...resProfile.data,
            gender: resProfile.data.gender || "" 
          }));
        }

        const resMe = await api.get("/me");
        if (resMe.data) {
          setCurrentEmail(resMe.data.email);
        }

      } catch (error) {
        console.error("Gagal load data", error);
        toast.error("Gagal memuat data pengguna");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* =======================
     2. HANDLERS (FOTO & PROFIL)
  ======================= */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    const uploadData = new FormData();
    uploadData.append("avatar", file);

    setUploading(true);
    try {
      const res = await api.post("/profile/avatar", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newUrl = res.data.avatar_url || res.data.url; 
      const updatedProfile = { ...formData, avatar_url: newUrl };
      await api.put("/profile", updatedProfile);
      setFormData(updatedProfile);
      toast.success("Foto profil berhasil diperbarui!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengupload foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/profile", formData);
      toast.success("Profil berhasil diperbarui");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  /* =======================
     3. HANDLER GANTI NOMOR HP (OTP)
  ======================= */
  
  // Step 1: Request OTP
  const handleRequestOtp = async () => {
    if (!newPhone || newPhone.length < 9) {
      toast.error("Masukkan nomor WhatsApp yang valid");
      return;
    }
    setPhoneLoading(true);
    try {
      await api.post("/users/change-phone/request-otp", { phone: newPhone });
      toast.success("Kode OTP dikirim ke WhatsApp Anda");
      setPhoneStep("VERIFY");
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      toast.error(err.response?.data?.error || "Gagal mengirim OTP");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      toast.error("Masukkan kode OTP yang valid");
      return;
    }
    setPhoneLoading(true);
    try {
      await api.post("/users/change-phone/verify-otp", { 
        phone: newPhone, 
        code: otpCode 
      });
      
      toast.success("Nomor telepon berhasil diperbarui!");
      
      // Update state lokal
      setFormData(prev => ({ ...prev, phone_number: newPhone }));
      
      // Reset & Tutup Dialog
      setIsPhoneOpen(false);
      setNewPhone("");
      setOtpCode("");
      setPhoneStep("INPUT");

    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      toast.error(err.response?.data?.error || "Kode OTP salah atau kadaluarsa");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Helper Input Angka Saja
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[0-9]*$/.test(val)) {
      setNewPhone(val);
    }
  };

  /* =======================
     4. HANDLERS SECURITY (EMAIL & PASS)
  ======================= */
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.new_email || !emailForm.password) {
      toast.error("Lengkapi data email baru dan password");
      return;
    }
    setEmailLoading(true);
    try {
      const res = await api.patch("/users/change-email", {
        new_email: emailForm.new_email,
        password: emailForm.password
      });
      toast.success("Email berhasil diperbarui!");
      setCurrentEmail(res.data.email);
      setEmailForm({ new_email: "", password: "" });
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      toast.error(err.response?.data?.error || "Gagal memperbarui email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.new_password !== passData.confirm_password) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    if (passData.new_password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setSaving(true);
    try {
      await api.post("/users/change-password", {
        old_password: passData.old_password,
        new_password: passData.new_password,
      });
      toast.success("Password berhasil diubah");
      setPassData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      toast.error(err.response?.data?.error || "Gagal mengubah password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const getAvatarSrc = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    let cleanPath = path.replace(/\\/g, "/");
    if (cleanPath.startsWith("/")) cleanPath = cleanPath.slice(1);
    if (!cleanPath.startsWith("uploads/")) cleanPath = `uploads/${cleanPath}`;
    return `${BACKEND_URL}/${cleanPath}`;
  };

  return (
    <div className="container mx-auto space-y-8 px-6 py-8 pb-20 text-slate-200">
      
      {/* HEADER PAGE */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Pengaturan Akun</h1>
        <p className="text-slate-400">
          Kelola informasi pribadi dan keamanan akun Anda.
        </p>
      </div>

      <Tabs defaultValue="biodata" className="w-full">
        <TabsList className="bg-slate-900/50 border border-white/10 p-1 mb-6">
          <TabsTrigger 
            value="biodata" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 px-6"
          >
            <UserCog className="mr-2 h-4 w-4" />
            Biodata Diri
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 px-6"
          >
            <Lock className="mr-2 h-4 w-4" />
            Keamanan
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: BIODATA ================= */}
        <TabsContent value="biodata">
          <div className="grid gap-6 md:grid-cols-12">
            
            {/* LEFT COLUMN: AVATAR */}
            <div className="md:col-span-4 lg:col-span-3">
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm text-slate-200 shadow-xl h-fit">
                <CardContent className="pt-8 flex flex-col items-center text-center gap-6">
                  <div className="relative group">
                    <Avatar className="h-40 w-40 border-4 border-slate-800 shadow-2xl">
                      <AvatarImage 
                        src={getAvatarSrc(formData.avatar_url)} 
                        className="object-cover" 
                      />
                      <AvatarFallback className="text-4xl bg-blue-600 text-white font-medium">
                        {formData.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Overlay Upload Button */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />

                  <div className="space-y-1 w-full px-2">
                    <h2 className="text-lg font-semibold text-white truncate">
                      {formData.full_name || "User Tanpa Nama"}
                    </h2>
                    <p className="text-sm text-slate-400 truncate">{formData.position || "Mahasiswa / Staff"}</p>
                  </div>
                  
                  {uploading ? (
                    <Button disabled variant="outline" className="w-full border-white/10 bg-white/5 text-slate-400">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengupload...
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="mr-2 h-4 w-4" /> Ganti Foto
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: FORM DATA */}
            <div className="md:col-span-8 lg:col-span-9">
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm text-slate-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">Informasi Profil</CardTitle>
                  <CardDescription className="text-slate-400">
                    Lengkapi data diri Anda. Nomor telepon hanya dapat diubah melalui verifikasi OTP.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    
                    {/* Row 1: Nama & NIM */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Nama Lengkap</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input 
                            placeholder="Contoh: Ahmad Nur" 
                            className="pl-9 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                            value={formData.full_name}
                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">NIM / NIDN</Label>
                        <div className="relative">
                          <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input 
                            placeholder="Nomor Induk" 
                            className="pl-9 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                            value={formData.identity_number}
                            onChange={(e) => setFormData({...formData, identity_number: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Dept & Jabatan */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Departemen / Prodi</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input 
                            placeholder="Contoh: Teknik Informatika" 
                            className="pl-9 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                            value={formData.department}
                            onChange={(e) => setFormData({...formData, department: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">Posisi / Jabatan</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input 
                            placeholder="Contoh: Mahasiswa Semester 5" 
                            className="pl-9 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                            value={formData.position}
                            onChange={(e) => setFormData({...formData, position: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Telepon & Gender */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Nomor Telepon (WA)</Label>
                        <div className="relative flex gap-2">
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                            <Input 
                              placeholder="08xxxxxxxx" 
                              className="pl-9 bg-slate-950/50 border-white/10 text-slate-400 placeholder:text-slate-600 cursor-not-allowed"
                              value={formData.phone_number}
                              readOnly
                              disabled
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                            onClick={() => setIsPhoneOpen(true)}
                          >
                            Ganti
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">*Gunakan tombol Ganti untuk merubah nomor.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">Jenis Kelamin</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                          <select
                            className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/50 pl-9 pr-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                            value={formData.gender}
                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          >
                            <option value="" className="bg-slate-900 text-slate-400">-- Pilih Gender --</option>
                            <option value="L" className="bg-slate-900">Laki-laki</option>
                            <option value="P" className="bg-slate-900">Perempuan</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Alamat Lengkap</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Textarea 
                          placeholder="Alamat domisili saat ini..." 
                          className="pl-9 min-h-[100px] bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                      </div>
                    </div>

                    <CardFooter className="flex justify-end p-0 pt-4 border-t border-white/5 mt-4">
                      <Button 
                        type="submit" 
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Simpan Perubahan
                          </>
                        )}
                      </Button>
                    </CardFooter>

                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ================= TAB 2: KEAMANAN ================= */}
        <TabsContent value="security">
          <div className="flex flex-col items-center space-y-8">
            
            {/* 1. CARD UBAH EMAIL */}
            <Card className="w-full max-w-2xl border-white/10 bg-slate-900/50 backdrop-blur-sm text-slate-200 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Ubah Email Address</CardTitle>
                <CardDescription className="text-slate-400">
                  Perbarui alamat email yang terhubung dengan akun Anda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateEmail} className="space-y-5">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                    <p className="text-sm text-blue-200">
                      Email saat ini: <span className="font-semibold text-white">{currentEmail || "Belum dimuat..."}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Email Baru</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input 
                        type="email"
                        placeholder="nama@email.com"
                        className="pl-9 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                        value={emailForm.new_email}
                        onChange={(e) => setEmailForm({...emailForm, new_email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Konfirmasi Password Saat Ini</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input 
                        type={showEmailPass ? "text" : "password"}
                        placeholder="Masukkan password Anda untuk verifikasi"
                        className="pl-9 pr-10 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                        value={emailForm.password}
                        onChange={(e) => setEmailForm({...emailForm, password: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailPass(!showEmailPass)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showEmailPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      type="submit" 
                      disabled={emailLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {emailLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                        </>
                      ) : "Simpan Email Baru"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* 2. CARD GANTI PASSWORD */}
            <Card className="w-full max-w-2xl border-white/10 bg-slate-900/50 backdrop-blur-sm text-slate-200 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Ganti Password</CardTitle>
                <CardDescription className="text-slate-400">
                  Pastikan akun Anda tetap aman dengan password yang kuat.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  
                  {/* Password Lama */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Password Saat Ini</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input 
                          type={showOldPass ? "text" : "password"}
                          placeholder="Masukkan password lama"
                          className="pl-9 pr-10 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                          value={passData.old_password}
                          onChange={(e) => setPassData({...passData, old_password: e.target.value})}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPass(!showOldPass)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/10 my-2" />

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Password Baru */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Password Baru</Label>
                      <div className="relative">
                        <Input 
                          type={showNewPass ? "text" : "password"}
                          placeholder="Minimal 6 karakter"
                          className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600 pr-10"
                          value={passData.new_password}
                          onChange={(e) => setPassData({...passData, new_password: e.target.value})}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Konfirmasi Password */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Konfirmasi Password</Label>
                      <div className="relative">
                        <Input 
                          type={showConfirmPass ? "text" : "password"}
                          placeholder="Ulangi password baru"
                          className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-blue-600 pr-10"
                          value={passData.confirm_password}
                          onChange={(e) => setPassData({...passData, confirm_password: e.target.value})}
                        />
                         <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={saving}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...
                        </>
                      ) : "Update Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================= */}
      {/* DIALOG GANTI NOMOR TELEPON */}
      {/* ========================================================= */}
      <Dialog open={isPhoneOpen} onOpenChange={setIsPhoneOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Ganti Nomor WhatsApp</DialogTitle>
            <DialogDescription className="text-slate-400">
              {phoneStep === "INPUT" 
                ? "Masukkan nomor WhatsApp baru Anda. Kami akan mengirimkan kode verifikasi." 
                : `Masukkan kode OTP yang dikirim ke ${newPhone}.`}
            </DialogDescription>
          </DialogHeader>

          {phoneStep === "INPUT" ? (
            // STEP 1: INPUT NOMOR
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nomor WhatsApp Baru</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Contoh: 08123456789" 
                    className="pl-9 bg-slate-950 border-white/10 text-white focus-visible:ring-blue-600"
                    value={newPhone}
                    onChange={handlePhoneInput}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500">Pastikan nomor aktif dan terhubung dengan WhatsApp.</p>
              </div>
            </div>
          ) : (
            // STEP 2: INPUT OTP
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kode OTP</Label>
                <Input 
                  placeholder="Masukkan 6 digit kode" 
                  className="bg-slate-950 border-white/10 text-white text-center tracking-widest text-lg focus-visible:ring-blue-600"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-center">
                 <Button 
                    variant="link" 
                    className="text-blue-400 h-auto p-0 text-sm"
                    onClick={() => setPhoneStep("INPUT")}
                  >
                    Ganti Nomor / Kirim Ulang?
                  </Button>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end gap-2">
             <Button 
              type="button" 
              variant="secondary" 
              className="bg-slate-800 text-white hover:bg-slate-700"
              onClick={() => setIsPhoneOpen(false)}
            >
              Batal
            </Button>

            {phoneStep === "INPUT" ? (
              <Button 
                type="button" 
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleRequestOtp}
                disabled={phoneLoading || !newPhone}
              >
                 {phoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 Kirim Kode
              </Button>
            ) : (
              <Button 
                type="button" 
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={handleVerifyOtp}
                disabled={phoneLoading || !otpCode}
              >
                 {phoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 Verifikasi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}