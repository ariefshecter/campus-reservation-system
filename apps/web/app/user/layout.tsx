"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import api from "@/lib/axios";
import { 
  LogOut, 
  User as UserIcon, 
  ChevronDown,
  LayoutDashboard,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// URL Backend (Pastikan portnya benar, biasanya 3000 atau 8080)
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Interface User yang diperluas untuk menangani berbagai kemungkinan nama field dari Go
type User = {
  name: string;
  email?: string;
  photo_url?: string;  // Kemungkinan 1 (Standar Frontend)
  photo?: string;      // Kemungkinan 2 (Standar Go GORM)
  image?: string;      // Kemungkinan 3
  avatar?: string;     // Kemungkinan 4
};

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api
      .get<User>("/me")
      .then((res) => {
        // ========================================================
        // DEBUG MODE: Cek Console Browser (F12) untuk melihat ini
        // ========================================================
        console.log("🔥 [DEBUG] DATA USER DARI BACKEND:", res.data);
        console.log("🔥 [DEBUG] Field Foto yang terdeteksi:", 
          res.data.photo_url || res.data.photo || res.data.image || "TIDAK ADA"
        );
        setUser(res.data);
      })
      .catch((err) => {
        console.error("Gagal load user:", err);
        // Uncomment baris di bawah jika ingin redirect paksa saat error
        // localStorage.removeItem("token");
        // router.push("/login");
      });
  }, [router]);

  const isActive = (path: string) =>
    pathname.startsWith(path)
      ? "text-white bg-white/10 shadow-sm border border-white/5"
      : "text-slate-400 hover:text-white hover:bg-white/5";

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // =========================================================
  // FUNGSI UTAMA: RESOLVE IMAGE URL (WINDOWS FRIENDLY)
  // =========================================================
  const resolveImageUrl = () => {
    if (!user) return undefined;

    // 1. Cari field mana yang berisi string gambar
    const rawUrl = user.photo_url || user.photo || user.image || user.avatar;

    if (!rawUrl || rawUrl === "") return undefined;

    // 2. Jika URL sudah lengkap (http/https), pakai langsung
    if (rawUrl.startsWith("http") || rawUrl.startsWith("https")) return rawUrl;

    // 3. FIX PATH WINDOWS: Ganti Backslash (\) menjadi Forward Slash (/)
    // Backend Go di Windows sering menyimpan path sebagai "uploads\foto.jpg"
    let cleanPath = rawUrl.replace(/\\/g, "/");

    // 4. Bersihkan slash di depan jika ada (misal "/uploads/foto.jpg" -> "uploads/foto.jpg")
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.slice(1);
    }

    // 5. Pastikan prefix 'uploads/' ada
    // Jika di DB cuma "foto.jpg", kita paksa jadi "uploads/foto.jpg"
    // Asumsi folder static di backend Go dilayani di endpoint /uploads
    if (!cleanPath.startsWith("uploads/")) {
      cleanPath = `uploads/${cleanPath}`;
    }

    // 6. Return URL Akhir
    const finalUrl = `${BACKEND_URL}/${cleanPath}`;
    
    // Debug URL hasil akhir (bisa dilihat di console)
    // console.log("Final Image URL:", finalUrl); 
    
    return finalUrl;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_circle_at_20%_10%,#1e3f78,transparent_45%),radial-gradient(700px_circle_at_80%_20%,#102b52,transparent_50%),linear-gradient(180deg,#071a33,#041225)]">
      
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6 lg:px-12">
          
          {/* LEFT: LOGO & NAV */}
          <div className="flex items-center gap-10">
            {/* LOGO UNISPACE (Konsisten dengan Landing Page) */}
            <Link href="/user/dashboard" className="flex items-center gap-3 group">
              <div className="relative h-10 w-10 shrink-0 transition-transform group-hover:scale-105">
                <Image 
                  src="/logo.png" 
                  alt="UniSpace Logo" 
                  fill
                  className="object-contain"
                />
              </div>
              <span className="hidden md:block text-xl font-bold tracking-tight text-slate-100">
                Uni<span className="text-blue-500">Space</span>
              </span>
            </Link>

            {/* DESKTOP NAV LINKS (Tanpa Ikon) */}
            <nav className="hidden md:flex items-center gap-2">
              <Link
                href="/user/dashboard"
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${isActive(
                  "/user/dashboard"
                )}`}
              >
                Dashboard
              </Link>
              <Link
                href="/user/my-bookings"
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${isActive(
                  "/user/my-bookings"
                )}`}
              >
                Booking Saya
              </Link>
            </nav>
          </div>

          {/* RIGHT: PROFILE DROPDOWN */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-10 w-auto rounded-full pl-2 pr-4 hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 gap-3 border border-transparent hover:border-white/10 transition-all"
                >
                  <Avatar className="h-8 w-8 border border-white/10">
                    {/* Menggunakan fungsi resolveImageUrl() tanpa argumen */}
                    <AvatarImage 
                      src={resolveImageUrl()} 
                      alt={user?.name} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-blue-600 text-white text-xs font-medium">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="hidden md:flex flex-col items-start text-xs">
                    <span className="font-medium text-slate-200 max-w-[100px] truncate">
                      {user?.name || "Memuat..."}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent 
                align="end" 
                className="w-56 rounded-xl border border-white/10 bg-slate-900/90 p-2 text-slate-200 backdrop-blur-xl shadow-2xl mt-2"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none text-white">{user?.name}</p>
                    <p className="text-xs leading-none text-slate-400">{user?.email || "Pengguna"}</p>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="bg-white/10" />
                
                <DropdownMenuItem asChild>
                  <Link href="/user/profile" className="cursor-pointer flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white transition-colors">
                    <UserIcon className="h-4 w-4" />
                    <span>Edit Profil</span>
                  </Link>
                </DropdownMenuItem>

                {/* Mobile Menu Links */}
                <div className="md:hidden">
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild>
                    <Link href="/user/dashboard" className="cursor-pointer flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/10">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user/my-bookings" className="cursor-pointer flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/10">
                      <CalendarDays className="h-4 w-4" />
                      <span>Booking Saya</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="bg-white/10" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="relative z-0">
        {children}
      </main>
    </div>
  );
}