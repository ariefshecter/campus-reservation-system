import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  CalendarCheck, 
  Clock, 
  ShieldCheck,
  ArrowRight
} from "lucide-react";

export default function Home() {
  return (
    // BACKGROUND UTAMA
    <div className="min-h-screen flex flex-col font-sans text-slate-100 bg-[radial-gradient(900px_circle_at_20%_10%,#1e3f78,transparent_45%),radial-gradient(700px_circle_at_80%_20%,#102b52,transparent_50%),linear-gradient(180deg,#071a33,#041225)]">
      
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
          
          {/* LOGO & NAME SECTION */}
          {/* UPDATE: Hapus gap-1 agar tidak ada jarak default */}
          <div className="flex items-center">
            
            {/* Container Gambar Logo */}
            <div className="relative flex h-14 w-auto">
              <Image 
                src="/logo.png" 
                alt="UniSpace Logo" 
                width={150} 
                height={60} 
                className="object-contain object-left"
                priority
              />
            </div>

            {/* TEKS NAMA SISTEM */}
            {/* UPDATE: Tambahkan '-ml-4' (margin-left negatif) 
               untuk menarik teks ke kiri secara paksa mendekati logo 
               (sesuaikan angkanya -3, -4, atau -5 jika perlu lebih dekat lagi)
            */}
            <span className="hidden md:block text-xl font-bold tracking-tight text-slate-100 mt-1 -ml-4">
              Uni<span className="text-blue-500">Space</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
                Masuk
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/50">
                Daftar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <main className="flex-1 flex flex-col justify-center">
        <section className="relative pt-10 pb-20 lg:pt-24 text-center px-6">
          <div className="container mx-auto max-w-4xl">
            
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300 mb-8 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
              Sistem Reservasi Kampus Online
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Pinjam Ruangan <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                Tanpa Ribet & Transparan
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-10 leading-relaxed">
              Cek jadwal, pilih ruangan, dan ajukan peminjaman langsung dari gadgetmu. 
              Hemat waktu tanpa perlu bolak-balik ke admin.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/20 rounded-full">
                  Booking Ruangan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base border-slate-600 text-slate-300 hover:bg-white/5 hover:text-white hover:border-slate-400 rounded-full bg-transparent">
                  Buat Akun Baru
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section className="py-16 pb-32 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-3 gap-6">
              
              <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Cek Ketersediaan</h3>
                <p className="text-sm text-slate-400">
                  Lihat ruangan kosong secara real-time. Hindari jadwal bentrok dengan kegiatan lain.
                </p>
              </div>

              <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Booking Cepat</h3>
                <p className="text-sm text-slate-400">
                  Proses pengajuan simpel. Pantau status persetujuan admin langsung dari dashboard.
                </p>
              </div>

              <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Sistem Terdata</h3>
                <p className="text-sm text-slate-400">
                  Semua riwayat terekam otomatis. Memastikan penggunaan fasilitas yang tertib.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-black/20 py-8">
        <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} UniSpacea - Campus Reservation System.</p>
        </div>
      </footer>
    </div>
  );
}