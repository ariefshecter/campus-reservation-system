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
  Users // Icon baru untuk Gender
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

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
  gender: string; // [BARU] Wajib ada (L/P)
  user_id?: string;
};

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
    gender: "", // [BARU] Default kosong
  });

  // State Ganti Password
  const [passData, setPassData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* =======================
     1. FETCH PROFILE
  ======================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile");
        if (res.data) {
          setFormData((prev) => ({ 
            ...prev, 
            ...res.data,
            // Pastikan gender tidak null
            gender: res.data.gender || "" 
          }));
        }
      } catch (error) {
        console.error("Gagal load profile", error);
        toast.error("Gagal memuat data profil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  /* =======================
     2. HANDLE UPLOAD FOTO
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
      
      const newUrl = res.data.url;
      setFormData((prev) => ({ ...prev, avatar_url: newUrl }));
      toast.success("Foto profil berhasil diupload");
    } catch (error) {
      console.error(error);
      toast.error("Gagal upload foto");
    } finally {
      setUploading(false);
    }
  };

  /* =======================
     3. HANDLE SAVE PROFILE
  ======================= */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/profile", formData);
      toast.success("Profil berhasil diperbarui");
      // Opsional: Reload untuk memastikan data fresh
      // window.location.reload(); 
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan profil (Cek kelengkapan data)");
    } finally {
      setSaving(false);
    }
  };

  /* =======================
     4. HANDLE CHANGE PASSWORD
  ======================= */
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
      const msg = err.response?.data?.error || "Gagal mengubah password";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const getAvatarSrc = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `http://localhost:3000${path}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Pengaturan Akun</h1>
          <p className="text-slate-500 mt-1">Kelola informasi pribadi dan keamanan akun Anda.</p>
        </div>

        <Tabs defaultValue="biodata" className="w-full">
          <TabsList className="bg-white border mb-6 p-1 h-12">
            <TabsTrigger value="biodata" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 h-10 px-6">Biodata Diri</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 h-10 px-6">Keamanan</TabsTrigger>
          </TabsList>

          {/* =======================
              TAB 1: BIODATA
          ======================= */}
          <TabsContent value="biodata">
            <div className="grid gap-8 md:grid-cols-[300px_1fr]">
              
              {/* KOLOM KIRI: AVATAR */}
              <Card className="h-fit">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  <div className="relative group">
                    <Avatar className="h-32 w-32 border-4 border-slate-100 shadow-xl">
                      <AvatarImage src={getAvatarSrc(formData.avatar_url)} className="object-cover" />
                      <AvatarFallback className="text-4xl bg-slate-200 text-slate-500">
                        {formData.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                    >
                      <Camera className="h-8 w-8" />
                    </div>
                  </div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />

                  <h2 className="mt-4 text-lg font-semibold text-slate-900">
                    {formData.full_name || "User Tanpa Nama"}
                  </h2>
                  <p className="text-sm text-slate-500">{formData.position || "Mahasiswa / Staff"}</p>
                  
                  {uploading && <p className="text-xs text-emerald-600 mt-2 animate-pulse">Mengupload...</p>}
                </CardContent>
              </Card>

              {/* KOLOM KANAN: FORM EDIT */}
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Profil</CardTitle>
                  <CardDescription>Lengkapi data diri Anda untuk keperluan administrasi.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    
                    {/* Baris 1: Nama & NIM */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nama Lengkap</Label>
                        <div className="relative">
                           <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                           <Input 
                             placeholder="Contoh: Ahmad Nur" 
                             className="pl-9"
                             value={formData.full_name}
                             onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                           />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Nomor Identitas (NIM/NIDN)</Label>
                         <div className="relative">
                           <Fingerprint className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                           <Input 
                             placeholder="Masukkan NIM / NIP" 
                             className="pl-9"
                             value={formData.identity_number}
                             onChange={(e) => setFormData({...formData, identity_number: e.target.value})}
                           />
                        </div>
                      </div>
                    </div>

                    {/* Baris 2: Dept & Jabatan */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Departemen / Prodi</Label>
                        <div className="relative">
                           <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                           <Input 
                             placeholder="Contoh: Teknik Informatika" 
                             className="pl-9"
                             value={formData.department}
                             onChange={(e) => setFormData({...formData, department: e.target.value})}
                           />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Posisi / Jabatan</Label>
                        <Input 
                           placeholder="Contoh: Mahasiswa / Dosen" 
                           value={formData.position}
                           onChange={(e) => setFormData({...formData, position: e.target.value})}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Baris 3: Telepon & Gender (Gender ditambahkan di sini) */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nomor Telepon (WhatsApp)</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="0812xxxx" 
                                    className="pl-9"
                                    type="tel"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Jenis Kelamin</Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                {/* Menggunakan Select HTML standar tapi dengan styling Shadcn */}
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                >
                                    <option value="">-- Pilih --</option>
                                    <option value="L">Laki-laki</option>
                                    <option value="P">Perempuan</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Alamat</Label>
                      <div className="relative">
                        <Textarea 
                          placeholder="Alamat lengkap domisili saat ini..." 
                          className="pl-9 min-h-[80px]"
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" /> Simpan Perubahan
                          </>
                        )}
                      </Button>
                    </div>

                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* =======================
              TAB 2: KEAMANAN
          ======================= */}
          <TabsContent value="security">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Ganti Password</CardTitle>
                <CardDescription>Pastikan akun Anda tetap aman dengan password yang kuat.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Password Saat Ini</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                          type="password" 
                          placeholder="Masukkan password lama"
                          className="pl-9"
                          value={passData.old_password}
                          onChange={(e) => setPassData({...passData, old_password: e.target.value})}
                        />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Password Baru</Label>
                      <Input 
                        type="password" 
                        placeholder="Minimal 6 karakter"
                        value={passData.new_password}
                        onChange={(e) => setPassData({...passData, new_password: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Konfirmasi Password</Label>
                      <Input 
                        type="password" 
                        placeholder="Ulangi password baru"
                        value={passData.confirm_password}
                        onChange={(e) => setPassData({...passData, confirm_password: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" variant="destructive" disabled={saving}>
                      {saving ? "Memproses..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}