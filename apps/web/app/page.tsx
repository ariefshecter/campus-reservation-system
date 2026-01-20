import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  CalendarCheck, 
  Building2, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-800">
              UNU Lampung <span className="text-emerald-600">Reservation</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="#fitur" className="hover:text-emerald-600 transition">Fitur</Link>
            <Link href="#cara-kerja" className="hover:text-emerald-600 transition">Cara Kerja</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-600 hover:text-emerald-600">
                Masuk
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-lg">
                Daftar Sekarang
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-400 opacity-20 blur-[100px]"></div>
        
        <div className="container mx-auto px-6 text-center lg:px-12">
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-emerald-600 mr-2"></span>
            Sistem Peminjaman Fasilitas Terpadu
          </div>
          
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            Kelola Peminjaman Ruangan <br/>
            <span className="text-emerald-600">Lebih Mudah & Transparan</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-10 leading-relaxed">
            Platform resmi Universitas Nahdlatul Ulama Lampung untuk reservasi aula, 
            laboratorium, dan fasilitas kampus lainnya secara online, real-time, dan efisien.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200/50">
                Booking Ruangan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-slate-300 text-slate-700 hover:bg-slate-50">
                Buat Akun Baru
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="fitur" className="py-24 bg-white">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Kenapa Menggunakan Sistem Ini?</h2>
            <p className="mt-4 text-slate-600">Solusi modern untuk menggantikan proses manual yang lambat.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group rounded-2xl border border-slate-100 bg-slate-50 p-8 transition hover:border-emerald-100 hover:bg-emerald-50/50 hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">Real-time Availability</h3>
              <p className="text-slate-600 leading-relaxed">
                Cek ketersediaan ruangan secara langsung tanpa perlu bertanya ke admin. Hindari jadwal bentrok.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-2xl border border-slate-100 bg-slate-50 p-8 transition hover:border-emerald-100 hover:bg-emerald-50/50 hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">Mudah & Cepat</h3>
              <p className="text-slate-600 leading-relaxed">
                Ajukan peminjaman dari mana saja. Pantau status persetujuan langsung dari dashboard Anda.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-2xl border border-slate-100 bg-slate-50 p-8 transition hover:border-emerald-100 hover:bg-emerald-50/50 hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">Terdata & Aman</h3>
              <p className="text-slate-600 leading-relaxed">
                Semua riwayat peminjaman tercatat rapi. Validasi pengguna memastikan penggunaan fasilitas yang bertanggung jawab.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FLOW SECTION ================= */}
      <section id="cara-kerja" className="py-24 border-t border-slate-100">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-3xl font-bold text-slate-900">Alur Peminjaman Sederhana</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-none pt-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Login / Daftar</h4>
                    <p className="text-slate-600 mt-1">Masuk menggunakan akun mahasiswa atau staf UNU Lampung.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-none pt-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Pilih Fasilitas & Jadwal</h4>
                    <p className="text-slate-600 mt-1">Cari ruangan yang tersedia dan tentukan jam pemakaian.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-none pt-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Tunggu Persetujuan</h4>
                    <p className="text-slate-600 mt-1">Admin akan memverifikasi permintaan Anda. Notifikasi status akan muncul di dashboard.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Illustration Placeholder */}
            <div className="lg:w-1/2">
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-8 shadow-2xl">
                 <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-100 blur-2xl"></div>
                 <div className="relative rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6 border-b pb-4">
                       <div className="h-10 w-10 rounded-full bg-slate-100"></div>
                       <div className="space-y-2">
                          <div className="h-2 w-32 rounded bg-slate-100"></div>
                          <div className="h-2 w-20 rounded bg-slate-100"></div>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <div className="h-20 w-full rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-sm font-medium">
                          Booking Approved ✅
                       </div>
                       <div className="h-20 w-full rounded-lg bg-slate-50 border border-slate-100"></div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="mt-auto border-t bg-slate-50 py-12">
        <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
          <p className="mb-2 font-semibold text-slate-900">Universitas Nahdlatul Ulama Lampung</p>
          <p>&copy; {new Date().getFullYear()} Campus Reservation System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}